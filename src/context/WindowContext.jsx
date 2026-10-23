// Controla todas las "ventanas flotantes" del escritorio (posición, tamaño,
// si están minimizadas/maximizadas, cuál está activa) y ofrece las acciones
// para moverlas, cambiarlas de tamaño, minimizarlas, etc.

import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { showToast } from '../components/UI/Toast';
import i18n from '../i18n';

const WindowContext = createContext();

// Da acceso a los datos y acciones del sistema de ventanas.
// The previous state/callback split had no consumers and did not isolate renders.
// eslint-disable-next-line react-refresh/only-export-components
export const useWindowContext = () => {
    const context = useContext(WindowContext);
    if (!context) {
        throw new Error('useWindowContext must be used within WindowProvider');
    }
    return context;
};

// Layout / z-index defaults for floating windows.
const DEFAULT_WINDOW_POSITION = { x: 100, y: 100 };
const DEFAULT_WINDOW_SIZE = { width: 400, height: 300 };
const BASE_Z_INDEX = 100;
const Z_INDEX_NORMALIZE_THRESHOLD = 10000; // reset z-indexes once they climb this high
const MINIMIZED_WINDOW_SIZE = { width: 180, height: 40 };

// Evita que una ventana minimizada quede colocada fuera de la pantalla.
const clampMinimizePosition = (position) => ({
    x: Math.min(Math.max(position.x, 0), Math.max(globalThis.innerWidth - MINIMIZED_WINDOW_SIZE.width, 0)),
    y: Math.min(Math.max(position.y, 0), Math.max(globalThis.innerHeight - MINIMIZED_WINDOW_SIZE.height, 0)),
});

// Envuelve toda la aplicación y guarda el estado de cada ventana flotante,
// ofreciendo las funciones para crearlas, cerrarlas y manipularlas.
export const WindowProvider = ({ children }) => {
    const [windows, setWindows] = useState({});
    const [activeWindowId, setActiveWindowId] = useState(null);
    const highestZIndexRef = useRef(BASE_Z_INDEX);
    const windowsRef = useRef(windows);
    const prevActiveRef = useRef(null);
    windowsRef.current = windows;

    // Dispatch custom events for interaction tracking (low coupling via DOM events)
    // Cuando cambia la ventana activa, avisa al resto de la aplicación (por
    // ejemplo, para medir cuánto tiempo se ha mirado cada ventana).
    useEffect(() => {
        if (prevActiveRef.current && prevActiveRef.current !== activeWindowId) {
            window.dispatchEvent(new CustomEvent('window-blurred', {
                detail: { windowId: prevActiveRef.current }
            }));
        }
        if (activeWindowId) {
            window.dispatchEvent(new CustomEvent('window-focused', {
                detail: { windowId: activeWindowId }
            }));
        }
        prevActiveRef.current = activeWindowId;
    }, [activeWindowId]);

    // Muestra el mensaje asociado a una acción ya confirmada sobre la ventana.
    // Keep notifications outside React state updaters, which StrictMode may replay.
    const showWindowToast = useCallback((_windowId, message) => {
        showToast(message, 2000);
    }, []);

    // when I create a new window I store it here
    // Da de alta una ventana nueva, con su posición y tamaño iniciales (si ya
    // existía, no hace nada).
    const registerWindow = useCallback((windowId, initialState = {}) => {
        if (windowsRef.current[windowId]) return;
        const position = initialState.position || DEFAULT_WINDOW_POSITION;
        const next = {
            ...windowsRef.current,
            [windowId]: {
                isMinimized: initialState.isMinimized ?? false,
                isMaximized: initialState.isMaximized || false,
                size: initialState.size || DEFAULT_WINDOW_SIZE,
                zIndex: initialState.zIndex || BASE_Z_INDEX,
                ...initialState,
                position,
                minimizePosition: initialState.minimizePosition || position,
                restorePosition: initialState.restorePosition || null,
            }
        };
        windowsRef.current = next;
        setWindows(next);
    }, []);

    // when I close a window I remove it from the list
    // Quita una ventana de la lista cuando se cierra.
    const unregisterWindow = useCallback((windowId) => {
        if (!windowsRef.current[windowId]) return;
        const next = { ...windowsRef.current };
        delete next[windowId];
        windowsRef.current = next;
        setWindows(next);
    }, []);

    // bring a window in front of all the others
    // Pone una ventana por delante de todas las demás (al hacer clic en ella),
    // y de vez en cuando reordena los números internos para que no crezcan sin límite.
    const bringToFront = useCallback((windowId) => {
        const previous = windowsRef.current;
        const current = previous[windowId];
        if (!current) return;

        const newHighest = highestZIndexRef.current + 1;
        highestZIndexRef.current = newHighest;
        let next;
        if (newHighest > Z_INDEX_NORMALIZE_THRESHOLD) {
            const sorted = Object.entries(previous).sort((a, b) => a[1].zIndex - b[1].zIndex);
            next = {};
            sorted.forEach(([id, win], index) => {
                next[id] = { ...win, zIndex: BASE_Z_INDEX + index };
            });
            next[windowId] = { ...next[windowId], zIndex: BASE_Z_INDEX + sorted.length };
            highestZIndexRef.current = BASE_Z_INDEX + sorted.length;
        } else {
            next = { ...previous, [windowId]: { ...current, zIndex: newHighest } };
        }
        windowsRef.current = next;
        setWindows(next);
        setActiveWindowId(windowId);
    }, []);

    // get translated window title from windowId
    // Calcula el título traducido de una ventana a partir de su identificador.
    const getWindowTitle = useCallback((windowId) => {
        const key = windowId.replace('-window', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const fallback = key.charAt(0).toUpperCase() + key.slice(1);
        return i18n.t(`windows.${key}`, { defaultValue: fallback });
    }, []);

    // Minimized pills keep their own anchor; programmatic centering must not move it.
    // Minimiza o restaura una ventana, recordando por separado dónde estaba
    // minimizada y dónde estaba normal, para no perder ninguna de las dos posiciones.
    const toggleMinimize = useCallback((windowId) => {
        const current = windowsRef.current[windowId];
        if (!current) return;
        const newIsMinimized = !current.isMinimized;
        const position = newIsMinimized
            ? clampMinimizePosition(current.minimizePosition || current.position)
            : (current.restorePosition || current.position);
        const next = {
            ...windowsRef.current,
            [windowId]: {
                ...current,
                isMinimized: newIsMinimized,
                isMaximized: current.isMaximized && newIsMinimized ? false : current.isMaximized,
                position,
                minimizePosition: newIsMinimized ? position : current.minimizePosition,
                restorePosition: newIsMinimized ? current.position : null,
            }
        };
        windowsRef.current = next;
        setWindows(next);

        const windowTitle = getWindowTitle(windowId);
        showWindowToast(
            windowId,
            i18n.t(newIsMinimized ? 'toast.minimized' : 'toast.restored', { window: windowTitle })
        );
    }, [showWindowToast, getWindowTitle]);

    // to toggle the window fullscreen on or off
    // Pone o quita el modo pantalla completa de una ventana (y si estaba
    // minimizada, primero la restaura).
    const toggleMaximize = useCallback((windowId) => {
        const current = windowsRef.current[windowId];
        if (!current) return;

        const nextWindow = current.isMinimized
            ? {
                ...current,
                isMinimized: false,
                position: current.restorePosition || current.position,
                restorePosition: null
            }
            : { ...current, isMaximized: !current.isMaximized };
        const next = { ...windowsRef.current, [windowId]: nextWindow };
        windowsRef.current = next;
        setWindows(next);

        if (!current.isMinimized) {
            const windowTitle = getWindowTitle(windowId);
            const message = current.isMaximized ? 'toast.restored' : 'toast.maximized';
            showWindowToast(windowId, i18n.t(message, { window: windowTitle }));
        }
    }, [showWindowToast, getWindowTitle]);

    // fit the window to the optimal size to show all the content
    // Ajusta el tamaño de una ventana para que quepa justo todo su contenido,
    // y la centra en la pantalla.
    const fitToContent = useCallback((windowId, contentSize) => {
        const current = windowsRef.current[windowId];
        if (!current) return;

        const headerHeight = 40;
        const padding = 20;
        const maxWidth = globalThis.innerWidth * 0.9;
        const maxHeight = globalThis.innerHeight * 0.85;
        const optimalWidth = Math.min(Math.max(contentSize.width + padding, 300), maxWidth);
        const optimalHeight = Math.min(Math.max(contentSize.height + headerHeight + padding, 200), maxHeight);
        const centerX = Math.max(20, (globalThis.innerWidth - optimalWidth) / 2);
        const centerY = Math.max(80, (globalThis.innerHeight - optimalHeight) / 2);
        const next = {
            ...windowsRef.current,
            [windowId]: {
                ...current,
                isMinimized: false,
                isMaximized: false,
                size: { width: optimalWidth, height: optimalHeight },
                position: { x: centerX, y: centerY }
            }
        };
        windowsRef.current = next;
        setWindows(next);

        const windowTitle = getWindowTitle(windowId);
        showWindowToast(windowId, i18n.t('toast.fittedToContent', { window: windowTitle }));
    }, [showWindowToast, getWindowTitle]);

    // save where the window is when I move it
    // Guarda la nueva posición de una ventana cuando el usuario la arrastra.
    const updatePosition = useCallback((windowId, position) => {
        const current = windowsRef.current[windowId];
        if (!current || (current.position.x === position.x && current.position.y === position.y)) return;
        const next = {
            ...windowsRef.current,
            [windowId]: { ...current, position, minimizePosition: position }
        };
        windowsRef.current = next;
        setWindows(next);
    }, []);

    // save the new size when I resize the window
    // Guarda el nuevo tamaño de una ventana cuando el usuario la redimensiona.
    const updateSize = useCallback((windowId, size) => {
        const current = windowsRef.current[windowId];
        if (!current || (current.size.width === size.width && current.size.height === size.height)) return;
        const next = {
            ...windowsRef.current,
            [windowId]: { ...current, size }
        };
        windowsRef.current = next;
        setWindows(next);
    }, []);

    const value = useMemo(() => ({
        windows,
        activeWindowId,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        fitToContent,
        updatePosition,
        updateSize,
        getWindowTitle,
        showWindowToast
    }), [
        windows,
        activeWindowId,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        fitToContent,
        updatePosition,
        updateSize,
        getWindowTitle,
        showWindowToast
    ]);

    return (
        <WindowContext.Provider value={value}>
            {children}
        </WindowContext.Provider>
    );
};
