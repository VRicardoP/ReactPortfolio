import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
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
    const toastTimeoutRef = useRef({});

    // Función auxiliar para mostrar toast sin duplicados - MEMOIZADA
    const showWindowToast = useCallback((windowId, message) => {
        if (toastTimeoutRef.current[windowId]) {
            clearTimeout(toastTimeoutRef.current[windowId]);
        }

        showToast(message, 2000);

        toastTimeoutRef.current[windowId] = setTimeout(() => {
            delete toastTimeoutRef.current[windowId];
        }, 2000);
    }, []);

    // Registrar una nueva ventana - OPTIMIZADO
    const registerWindow = useCallback((windowId, initialState = {}) => {
        setWindows(prev => {
            // Evitar registrar si ya existe
            if (prev[windowId]) return prev;

            return {
                ...prev,
                [windowId]: {
                    isMinimized: initialState.isMinimized || false,
                    isMaximized: initialState.isMaximized || false,
                    position: initialState.position || { x: 100, y: 100 },
                    size: initialState.size || { width: 400, height: 300 },
                    zIndex: initialState.zIndex || 100,
                    ...initialState
                }
            };
        });
    }, []);

    // Desregistrar ventana - OPTIMIZADO
    const unregisterWindow = useCallback((windowId) => {
        setWindows(prev => {
            const newWindows = { ...prev };
            delete newWindows[windowId];
            return newWindows;
        });
    }, []);

    // Traer ventana al frente - OPTIMIZADO Y CORREGIDO
    const bringToFront = useCallback((windowId) => {
        setHighestZIndex(prev => {
            const newZIndex = prev + 1;

            setWindows(prevWindows => {
                const currentWindow = prevWindows[windowId];
                if (!currentWindow) return prevWindows;

                // Verificar si ya está al frente
                const maxZ = Math.max(...Object.values(prevWindows).map(w => w.zIndex));
                if (currentWindow.zIndex === maxZ && maxZ >= newZIndex - 1) {
                    return prevWindows;
                }

                return {
                    ...prevWindows,
                    [windowId]: {
                        ...currentWindow,
                        zIndex: newZIndex
                    }
                };
            });

            return newZIndex;
        });
    }, []);

    // Toggle minimizar - OPTIMIZADO
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

    // Toggle maximizar - OPTIMIZADO
    const toggleMaximize = useCallback((windowId) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

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

    // Actualizar posición - OPTIMIZADO
    const updatePosition = useCallback((windowId, position) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            // No actualizar si la posición es la misma
            if (window.position.x === position.x && window.position.y === position.y) {
                return prev;
            }

            return {
                ...prev,
                [windowId]: {
                    ...window,
                    position
                }
            };
        });
    }, []);

    // Actualizar tamaño - OPTIMIZADO
    const updateSize = useCallback((windowId, size) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            // No actualizar si el tamaño es el mismo
            if (window.size.width === size.width && window.size.height === size.height) {
                return prev;
            }

            return {
                ...prev,
                [windowId]: {
                    ...window,
                    size
                }
            };
        });
    }, []);

    // Memoizar el value para evitar re-renders innecesarios
    const value = useMemo(() => ({
        windows,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        updatePosition,
        updateSize
    }), [
        windows,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        updatePosition,
        updateSize
    ]);

    return (
        <WindowContext.Provider value={value}>
            {children}
        </WindowContext.Provider>
    );
};