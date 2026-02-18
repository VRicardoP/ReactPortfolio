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

    // to show notifications without duplicates
    const showWindowToast = useCallback((windowId, message) => {
        if (toastTimeoutRef.current[windowId]) {
            clearTimeout(toastTimeoutRef.current[windowId]);
        }

        showToast(message, 2000);

        toastTimeoutRef.current[windowId] = setTimeout(() => {
            delete toastTimeoutRef.current[windowId];
        }, 2000);
    }, []);

    // when I create a new window I store it here
    const registerWindow = useCallback((windowId, initialState = {}) => {
        setWindows(prev => {
            // if it already exists don't create it again
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

    // when I close a window I remove it from the list
    const unregisterWindow = useCallback((windowId) => {
        setWindows(prev => {
            const newWindows = { ...prev };
            delete newWindows[windowId];
            return newWindows;
        });
    }, []);

    // bring a window in front of all the others
    const bringToFront = useCallback((windowId) => {
        setHighestZIndex(prev => {
            const newZIndex = prev + 1;

            setWindows(prevWindows => {
                const currentWindow = prevWindows[windowId];
                if (!currentWindow) return prevWindows;

                // check if it's already in front to avoid doing anything
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

    // to minimize or restore a window
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

    // to toggle the window fullscreen on or off
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

    // fit the window to the optimal size to show all the content
    const fitToContent = useCallback((windowId, contentSize) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            // add padding for the header and borders
            const headerHeight = 40;
            const padding = 20;
            const maxWidth = globalThis.innerWidth * 0.9;
            const maxHeight = globalThis.innerHeight * 0.85;

            const optimalWidth = Math.min(Math.max(contentSize.width + padding, 300), maxWidth);
            const optimalHeight = Math.min(Math.max(contentSize.height + headerHeight + padding, 200), maxHeight);

            // center the window on the screen
            const centerX = Math.max(20, (globalThis.innerWidth - optimalWidth) / 2);
            const centerY = Math.max(80, (globalThis.innerHeight - optimalHeight) / 2);

            const windowTitle = windowId
                .replace('-window', '')
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            showWindowToast(windowId, `${windowTitle} fitted to content`);

            return {
                ...prev,
                [windowId]: {
                    ...window,
                    isMinimized: false,
                    isMaximized: false,
                    size: { width: optimalWidth, height: optimalHeight },
                    position: { x: centerX, y: centerY }
                }
            };
        });
    }, [showWindowToast]);

    // save where the window is when I move it
    const updatePosition = useCallback((windowId, position) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            // if it didn't move don't do anything
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

    // save the new size when I resize the window
    const updateSize = useCallback((windowId, size) => {
        setWindows(prev => {
            const window = prev[windowId];
            if (!window) return prev;

            // if the size is the same don't do anything
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

    // combine everything so components can use it
    const value = useMemo(() => ({
        windows,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        fitToContent,
        updatePosition,
        updateSize
    }), [
        windows,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        fitToContent,
        updatePosition,
        updateSize
    ]);

    return (
        <WindowContext.Provider value={value}>
            {children}
        </WindowContext.Provider>
    );
};