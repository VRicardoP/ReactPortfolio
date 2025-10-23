import { createContext, useContext, useState, useCallback } from 'react';
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

    // Toggle minimizar
    const toggleMinimize = useCallback((windowId) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            const newState = {
                ...prev,
                [windowId]: {
                    ...window,
                    isMinimized: !window.isMinimized,
                    isMaximized: window.isMaximized && window.isMinimized ? false : window.isMaximized
                }
            };

            // Mostrar toast
            const windowTitle = windowId.replace('-window', '').replace(/-/g, ' ');
            if (!window.isMinimized) {
                showToast(`${windowTitle} minimized`);
            } else {
                showToast(`${windowTitle} restored`);
            }

            return newState;
        });
    }, []);

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

            const newState = {
                ...prev,
                [windowId]: {
                    ...window,
                    isMaximized: !window.isMaximized
                }
            };

            // Mostrar toast
            const windowTitle = windowId.replace('-window', '').replace(/-/g, ' ');
            if (!window.isMaximized) {
                showToast(`${windowTitle} maximized`);
            } else {
                showToast(`${windowTitle} restored`);
            }

            return newState;
        });
    }, []);

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