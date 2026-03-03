import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { showToast } from '../components/UI/Toast';
import i18n from '../i18n';

const WindowStateContext = createContext();
const WindowCallbacksContext = createContext();

// Granular hooks — use these when you only need state OR callbacks
// eslint-disable-next-line react-refresh/only-export-components
export const useWindowState = () => {
    const context = useContext(WindowStateContext);
    if (!context) {
        throw new Error('useWindowState must be used within WindowProvider');
    }
    return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWindowCallbacks = () => {
    const context = useContext(WindowCallbacksContext);
    if (!context) {
        throw new Error('useWindowCallbacks must be used within WindowProvider');
    }
    return context;
};

// Backward-compatible hook — combines both contexts
// eslint-disable-next-line react-refresh/only-export-components
export const useWindowContext = () => {
    const state = useWindowState();
    const callbacks = useWindowCallbacks();
    return useMemo(() => ({ ...state, ...callbacks }), [state, callbacks]);
};

export const WindowProvider = ({ children }) => {
    const [windows, setWindows] = useState({});
    const [activeWindowId, setActiveWindowId] = useState(null);
    const highestZIndexRef = useRef(100);
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
                    isMinimized: initialState.isMinimized ?? false,
                    isMaximized: initialState.isMaximized || false,
                    position: initialState.position || { x: 100, y: 100 },
                    size: initialState.size || { width: 400, height: 300 },
                    zIndex: initialState.zIndex || 100,
                    ...initialState,
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
        setActiveWindowId(windowId);
        setWindows(prev => {
            const current = prev[windowId];
            if (!current) return prev;

            const newHighest = highestZIndexRef.current + 1;
            highestZIndexRef.current = newHighest;

            // Normalize if z-index gets too high
            if (newHighest > 10000) {
                const sorted = Object.entries(prev)
                    .sort((a, b) => a[1].zIndex - b[1].zIndex);
                const normalized = {};
                sorted.forEach(([id, win], index) => {
                    normalized[id] = { ...win, zIndex: 100 + index };
                });
                normalized[windowId] = { ...normalized[windowId], zIndex: 100 + sorted.length };
                highestZIndexRef.current = 100 + sorted.length;
                return normalized;
            }

            return {
                ...prev,
                [windowId]: { ...current, zIndex: newHighest }
            };
        });
    }, []);

    // get translated window title from windowId
    const getWindowTitle = useCallback((windowId) => {
        const key = windowId.replace('-window', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const fallback = key.charAt(0).toUpperCase() + key.slice(1);
        return i18n.t(`windows.${key}`, { defaultValue: fallback });
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

            const windowTitle = getWindowTitle(windowId);

            if (newIsMinimized) {
                showWindowToast(windowId, i18n.t('toast.minimized', { window: windowTitle }));
            } else {
                showWindowToast(windowId, i18n.t('toast.restored', { window: windowTitle }));
            }

            return newState;
        });
    }, [showWindowToast, getWindowTitle]);

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

            const windowTitle = getWindowTitle(windowId);

            if (newIsMaximized) {
                showWindowToast(windowId, i18n.t('toast.maximized', { window: windowTitle }));
            } else {
                showWindowToast(windowId, i18n.t('toast.restored', { window: windowTitle }));
            }

            return newState;
        });
    }, [showWindowToast, getWindowTitle]);

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

            const windowTitle = getWindowTitle(windowId);

            showWindowToast(windowId, i18n.t('toast.fittedToContent', { window: windowTitle }));

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
    }, [showWindowToast, getWindowTitle]);

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

    // cycle focus to the next or previous non-minimized window
    const focusNextWindow = useCallback((reverse = false) => {
        setWindows(prev => {
            const nonMinimized = Object.entries(prev)
                .filter(([, w]) => !w.isMinimized)
                .sort((a, b) => a[1].zIndex - b[1].zIndex);
            if (nonMinimized.length < 2) return prev;

            const currentIdx = nonMinimized.findIndex(([id]) => id === activeWindowId);
            const nextIdx = reverse
                ? (currentIdx <= 0 ? nonMinimized.length - 1 : currentIdx - 1)
                : (currentIdx >= nonMinimized.length - 1 ? 0 : currentIdx + 1);
            const [nextId] = nonMinimized[nextIdx];

            const newHighest = highestZIndexRef.current + 1;
            highestZIndexRef.current = newHighest;
            setActiveWindowId(nextId);

            return {
                ...prev,
                [nextId]: { ...prev[nextId], zIndex: newHighest }
            };
        });
    }, [activeWindowId]);

    // Callbacks are stable (all wrapped in useCallback) — this value rarely changes
    const callbacksValue = useMemo(() => ({
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        fitToContent,
        updatePosition,
        updateSize,
        focusNextWindow,
        getWindowTitle,
        showWindowToast
    }), [
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        fitToContent,
        updatePosition,
        updateSize,
        focusNextWindow,
        getWindowTitle,
        showWindowToast
    ]);

    // State changes on every window mutation (position, size, z-index, minimize, maximize)
    const stateValue = useMemo(() => ({
        windows,
        activeWindowId
    }), [windows, activeWindowId]);

    return (
        <WindowCallbacksContext.Provider value={callbacksValue}>
            <WindowStateContext.Provider value={stateValue}>
                {children}
            </WindowStateContext.Provider>
        </WindowCallbacksContext.Provider>
    );
};
