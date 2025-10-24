import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { showToast } from '../components/UI/Toast';

const WindowContext = createContext();

export const useWindowContext = () => {
    const context = useContext(WindowContext);
    if (!context) {
        throw new Error('useWindowContext must be used within WindowProvider');
    }
    return context;
};

export const WindowProvider = ({ children }) => {
    const [windows, setWindows] = useState({});
    const [highestZIndex, setHighestZIndex] = useState(100);
    const toastTimeoutRef = useRef({}); // Para evitar toasts duplicados

    // Registrar una nueva ventana
    const registerWindow = useCallback((windowId, initialState = {}) => {
        setWindows(prev => ({
            ...prev,
            [windowId]: {
                isMinimized: initialState.isMinimized || false,
                isMaximized: initialState.isMaximized || false,
                position: initialState.position || { x: 100, y: 100 },
                size: initialState.size || { width: 400, height: 300 },
                zIndex: initialState.zIndex || 100,
                ...initialState
            }
        }));
    }, []);

    // Desregistrar ventana
    const unregisterWindow = useCallback((windowId) => {
        setWindows(prev => {
            const newWindows = { ...prev };
            delete newWindows[windowId];
            return newWindows;
        });
    }, []);

    // Traer ventana al frente
    const bringToFront = useCallback((windowId) => {
        const newZIndex = highestZIndex + 1;
        setHighestZIndex(newZIndex);
        setWindows(prev => ({
            ...prev,
            [windowId]: {
                ...prev[windowId],
                zIndex: newZIndex
            }
        }));
    }, [highestZIndex]);

    // Función auxiliar para mostrar toast sin duplicados
    const showWindowToast = useCallback((windowId, message) => {
        // Cancelar toast anterior si existe
        if (toastTimeoutRef.current[windowId]) {
            clearTimeout(toastTimeoutRef.current[windowId]);
        }

        // Mostrar nuevo toast
        showToast(message, 2000);

        // Guardar referencia del timeout
        toastTimeoutRef.current[windowId] = setTimeout(() => {
            delete toastTimeoutRef.current[windowId];
        }, 2000);
    }, []);

    // Toggle minimizar
    const toggleMinimize = useCallback((windowId) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            const newIsMinimized = !window.isMinimized;

            const newState = {
                ...prev,
                [windowId]: {
                    ...window,
                    isMinimized: newIsMinimized,
                    isMaximized: window.isMaximized && newIsMinimized ? false : window.isMaximized
                }
            };

            // Mostrar toast solo una vez
            const windowTitle = windowId
                .replace('-window', '')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            if (newIsMinimized) {
                showWindowToast(windowId, `${windowTitle} minimized`);
            } else {
                showWindowToast(windowId, `${windowTitle} restored`);
            }

            return newState;
        });
    }, [showWindowToast]);

    // Toggle maximizar
    const toggleMaximize = useCallback((windowId) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            // Si está minimizada, primero restaurar
            if (window.isMinimized) {
                return {
                    ...prev,
                    [windowId]: {
                        ...window,
                        isMinimized: false
                    }
                };
            }

            const newIsMaximized = !window.isMaximized;

            const newState = {
                ...prev,
                [windowId]: {
                    ...window,
                    isMaximized: newIsMaximized
                }
            };

            // Mostrar toast solo una vez
            const windowTitle = windowId
                .replace('-window', '')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            if (newIsMaximized) {
                showWindowToast(windowId, `${windowTitle} maximized`);
            } else {
                showWindowToast(windowId, `${windowTitle} restored`);
            }

            return newState;
        });
    }, [showWindowToast]);

    // Actualizar posición
    const updatePosition = useCallback((windowId, position) => {
        setWindows(prev => ({
            ...prev,
            [windowId]: {
                ...prev[windowId],
                position
            }
        }));
    }, []);

    // Actualizar tamaño
    const updateSize = useCallback((windowId, size) => {
        setWindows(prev => ({
            ...prev,
            [windowId]: {
                ...prev[windowId],
                size
            }
        }));
    }, []);

    const value = {
        windows,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        updatePosition,
        updateSize
    };

    return (
        <WindowContext.Provider value={value}>
            {children}
        </WindowContext.Provider>
    );
};