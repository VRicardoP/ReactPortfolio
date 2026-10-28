// Es el "marco" que usan todas las ventanas (del portfolio y del panel):
// en el escritorio se puede arrastrar, cambiar de tamaño, minimizar y
// maximizar; en el móvil se convierte en una sección plegable sencilla.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowContext } from '../../context/WindowContext';
import useDraggable from '../../hooks/useDraggable';
import useResizable from '../../hooks/useResizable';
import useIsMobile from '../../hooks/useIsMobile';
import Tooltip from '../UI/Tooltip';
import '../../styles/floating-window.css';

// DT-208: margen que una ventana recién creada deja hasta el borde de la
// pantalla. En una tablet que conserva el escritorio, una ventana de 900 px
// no puede nacer más ancha que el viewport; después mandan arrastrar y
// redimensionar, que ya acotan por su cuenta.
const VIEWPORT_MARGIN = 20;
const fitToViewport = ({ width, height }) => ({
    width: Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2),
    height: Math.min(height, window.innerHeight - VIEWPORT_MARGIN * 2),
});

// Desktop: the original floating window with drag, resize, minimize, maximize
// Versión de escritorio: la ventana flotante de verdad, con todos sus controles.
const FloatingWindowDesktop = ({
    id,
    title,
    children,
    initialPosition = { x: 100, y: 100 },
    initialSize = { width: 400, height: 300 }
}) => {
    const { t } = useTranslation();
    const windowRef = useRef(null);
    const {
        windows,
        activeWindowId,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        fitToContent,
        updatePosition,
        updateSize
    } = useWindowContext();

    const windowState = windows[id];

    // when the window is created register it in the system (runs once on mount)
    // Da de alta esta ventana en el sistema al crearla, y la retira al desmontarse.
    useEffect(() => {
        registerWindow(id, {
            position: initialPosition,
            size: fitToViewport(initialSize),
            isMinimized: false,
            isMaximized: false,
            zIndex: 100
        });

        return () => unregisterWindow(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, registerWindow, unregisterWindow]);

    // stable callback references to prevent re-renders from killing drag/resize listeners
    const handlePositionChange = useCallback((pos) => updatePosition(id, pos), [id, updatePosition]);
    const handleSizeChange = useCallback((size) => updateSize(id, size), [id, updateSize]);
    // this allows dragging and resizing the window
    const {
        handlePointerDown: handleDragStart,
        handlePointerMove: handleDragMove,
        handlePointerUp: handleDragEnd,
        handlePointerCancel: handleDragCancel,
        handleLostPointerCapture: handleDragCaptureLost
    } = useDraggable(
        windowRef,
        windowState?.isMaximized,
        handlePositionChange
    );

    const {
        handlePointerDown: handleResizeStart,
        handlePointerMove: handleResizeMove,
        handlePointerUp: handleResizeEnd,
        handlePointerCancel: handleResizeCancel,
        handleLostPointerCapture: handleResizeCaptureLost,
        handleKeyboardResize
    } = useResizable(
        windowRef,
        windowState?.isMinimized,
        windowState?.isMaximized,
        handleSizeChange,
        handlePositionChange
    );

    // if I click on the window bring it to the front
    // Al hacer clic en la ventana, la trae al frente (salvo que sea un botón de control).
    const handleWindowClick = (e) => {
        // if it's a minimize or maximize button don't do anything here
        if (e.target.classList.contains('control-btn')) {
            return;
        }
        bringToFront(id);
    };

    // keyboard handler for accessibility
    // Permite minimizar la ventana con la tecla Escape.
    const handleKeyDown = (e) => {
        if (e.target.closest?.('input, select, textarea, [contenteditable]')) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            toggleMinimize(id);
        }
    };

    // when I minimize or restore the window
    // Minimiza o restaura la ventana; al restaurarla, la trae al frente.
    const handleToggleMinimize = (e) => {
        e.stopPropagation();
        toggleMinimize(id);
        // Restoring can bring the registered window forward immediately.
        if (windowState?.isMinimized) {
            bringToFront(id);
        }
    };

    // when maximizing from minimized, fit to content
    // Maximiza la ventana; si estaba minimizada, en vez de maximizar la
    // ajusta al tamaño ideal para su contenido.
    const handleToggleMaximize = useCallback((e) => {
        e.stopPropagation();

        // if minimized, fit to optimal content size
        if (windowState?.isMinimized) {
            // use the initial size as reference for the content
            fitToContent(id, { width: initialSize.width, height: initialSize.height });
        } else {
            toggleMaximize(id);
        }

        bringToFront(id);
    }, [windowState?.isMinimized, id, fitToContent, initialSize, toggleMaximize, bringToFront]);

    if (!windowState) return null;

    const { position, size, zIndex, isMinimized, isMaximized } = windowState;

    const windowStyle = {
        left: `${position.x}px`,
        top: `${position.y}px`,
        // DT-135: the conditional branches below were always overridden by
        // floating-window.css `.window-collapsed`/`.window-maximized` `!important`.
        // width: isMinimized ? '180px' : isMaximized ? '100vw' : `${size.width}px`,
        // height: isMinimized ? '40px' : isMaximized ? '100vh' : `${size.height}px`,
        // Normal-state dimensions remain inline because drag/resize updates them.
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: zIndex
    };

    const isActive = id === activeWindowId && !isMinimized;

    const windowClasses = [
        'floating-window',
        isMinimized && 'window-collapsed',
        isMaximized && 'window-maximized',
        isActive && 'window-active'
    ].filter(Boolean).join(' ');

    // DT-137: previous root binding `onMouseDown={handleWindowClick}` is
    // superseded by the pointer event shared with the drag header.
    return (
        <div
            ref={windowRef}
            className={windowClasses}
            style={windowStyle}
            onPointerDown={handleWindowClick}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-labelledby={`${id}-title`}
            tabIndex={-1}
        >
            {/* DT-137: `onMouseDown={handleDragStart}` is superseded by Pointer
                Events so the header can retain capture outside its bounds. */}
            <div
                className="window-header"
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragCancel}
                onLostPointerCapture={handleDragCaptureLost}
            >
                <div className="window-controls">
                    <Tooltip text={t('windows.controls.minimize')} position="bottom">
                        <button
                            aria-label={t('windows.controls.minimize')}
                            className="control-btn control-minimize"
                            onClick={handleToggleMinimize}
                        />
                    </Tooltip>
                    <Tooltip text={isMinimized ? t('windows.controls.fitToContent') : t('windows.controls.maximize')} position="bottom">
                        <button
                            aria-label={isMinimized ? t('windows.controls.fitToContent') : t('windows.controls.maximize')}
                            className="control-btn control-maximize"
                            onClick={handleToggleMaximize}
                        />
                    </Tooltip>
                </div>
                <span className="window-title" id={`${id}-title`} role="heading" aria-level="2">{title}</span>
            </div>

            {/* DT-185: el contenido se queda MONTADO al minimizar y lo oculta
                la regla que ya existía, `.window-collapsed .window-content
                { display: none }`. Antes se desmontaba, así que minimizar
                destruía el estado de dentro: se perdía la conversación del
                chat, el Kanban volvía a pedir sus datos y el mapa se
                reconstruía. Leaflet y el mapa de calor recuperan su tamaño al
                volver a mostrarse porque ambos observan su contenedor. */}
            <div className="window-content">
                {children}
            </div>

            {!isMinimized && (
                <>
                    {/* borders for resizing */}
                    {!isMaximized && (
                        <>
                            {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) => (
                                <div
                                    key={dir}
                                    className={`resize-handle resize-handle-${dir}`}
                                    role="separator"
                                    aria-label={t('windows.controls.resize', {
                                        edge: t(`windows.controls.resizeEdges.${dir}`),
                                    })}
                                    tabIndex={0}
                                    onPointerDown={(e) => handleResizeStart(e, dir)}
                                    onPointerMove={handleResizeMove}
                                    onPointerUp={handleResizeEnd}
                                    onPointerCancel={handleResizeCancel}
                                    onLostPointerCapture={handleResizeCaptureLost}
                                    onKeyDown={(e) => handleKeyboardResize(e, dir)}
                                />
                            ))}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

// Mobile: a collapsible section that replaces the floating window
// Versión móvil: en vez de una ventana flotante, una sección que se puede
// abrir y cerrar tocándola (como un acordeón).
const FloatingWindowMobile = ({ id, title, children, defaultExpanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Abre o cierra la sección.
    const handleToggle = () => setIsExpanded(prev => !prev);

    // Permite abrir/cerrar la sección también con el teclado (Enter o espacio).
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    };

    return (
        <section
            className={`mobile-section${isExpanded ? ' mobile-section-expanded' : ''}`}
            aria-labelledby={`${id}-title`}
        >
            <div
                className="mobile-section-header"
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
            >
                <span className="mobile-section-title" id={`${id}-title`}>{title}</span>
                <span
                    className={`mobile-section-chevron${isExpanded ? ' rotated' : ''}`}
                    aria-hidden="true"
                />
            </div>
            {isExpanded && (
                <div className="mobile-section-content">
                    {children}
                </div>
            )}
        </section>
    );
};

// Dispatcher: picks the right component based on screen size
// Elige qué versión mostrar (escritorio o móvil) según el tamaño de pantalla.
const FloatingWindow = (props) => {
    const isMobile = useIsMobile();

    if (isMobile) {
        return <FloatingWindowMobile {...props} />;
    }

    return <FloatingWindowDesktop {...props} />;
};

export default FloatingWindow;
