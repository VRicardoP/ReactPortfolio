import { useEffect, useRef, useCallback } from 'react';
import { useWindowContext } from '../../context/WindowContext';
import useDraggable from '../../hooks/useDraggable';
import useResizable from '../../hooks/useResizable';
import Tooltip from '../UI/Tooltip';
import '../../styles/floating-window.css';

const FloatingWindow = ({
    id,
    title,
    children,
    initialPosition = { x: 100, y: 100 },
    initialSize = { width: 400, height: 300 }
}) => {
    const windowRef = useRef(null);
    const contentRef = useRef(null);
    const {
        windows,
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

    // cuando se crea la ventana la registro en el sistema
    useEffect(() => {
        registerWindow(id, {
            position: initialPosition,
            size: initialSize,
            isMinimized: false,
            isMaximized: false,
            zIndex: 100
        });

        return () => unregisterWindow(id);
    }, [id, registerWindow, unregisterWindow]);

    // esto permite arrastrar y cambiar el tamaño de la ventana
    const { handleMouseDown: handleDragStart } = useDraggable(
        windowRef,
        windowState?.isMinimized,
        windowState?.isMaximized,
        (pos) => updatePosition(id, pos),
        () => bringToFront(id)
    );

    const { handleResizeStart } = useResizable(
        windowRef,
        windowState?.isMinimized,
        windowState?.isMaximized,
        (size) => updateSize(id, size),
        (pos) => updatePosition(id, pos),
        () => bringToFront(id)
    );

    // si hago click en la ventana la pongo delante de las demas
    const handleWindowClick = (e) => {
        // si es un boton de minimizar o maximizar no hago nada aqui
        if (e.target.classList.contains('control-btn')) {
            return;
        }
        bringToFront(id);
    };

    // cuando minimizo o restauro la ventana
    const handleToggleMinimize = (e) => {
        e.stopPropagation();
        toggleMinimize(id);
        // si estaba minimizada la pongo delante al restaurarla
        if (windowState?.isMinimized) {
            setTimeout(() => bringToFront(id), 100);
        }
    };

    // cuando maximizo desde minimizado, ajusto al contenido
    const handleToggleMaximize = useCallback((e) => {
        e.stopPropagation();

        // si esta minimizado, ajusto al tamaño optimo del contenido
        if (windowState?.isMinimized) {
            // uso el tamaño inicial como referencia para el contenido
            fitToContent(id, { width: initialSize.width, height: initialSize.height });
        } else {
            toggleMaximize(id);
        }

        setTimeout(() => bringToFront(id), 100);
    }, [windowState?.isMinimized, id, fitToContent, initialSize, toggleMaximize, bringToFront]);

    if (!windowState) return null;

    const { position, size, zIndex, isMinimized, isMaximized } = windowState;

    const windowStyle = {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '180px' : isMaximized ? '100vw' : `${size.width}px`,
        height: isMinimized ? '40px' : isMaximized ? '100vh' : `${size.height}px`,
        zIndex: zIndex
    };

    const windowClasses = [
        'floating-window',
        isMinimized && 'window-collapsed',
        isMaximized && 'window-maximized'
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={windowRef}
            className={windowClasses}
            style={windowStyle}
            onMouseDown={handleWindowClick}
            onClick={handleWindowClick}
        >
            <div
                className="window-header"
                onMouseDown={handleDragStart}
            >
                <div className="window-controls">
                    <Tooltip text="Minimize" position="bottom">
                        <button
                            className="control-btn control-minimize"
                            onClick={handleToggleMinimize}
                        />
                    </Tooltip>
                    <Tooltip text={isMinimized ? "Fit to content" : "Maximize"} position="bottom">
                        <button
                            className="control-btn control-maximize"
                            onClick={handleToggleMaximize}
                        />
                    </Tooltip>
                </div>
                <div className="window-title">{title}</div>
            </div>

            {!isMinimized && (
                <>
                    <div className="window-content" ref={contentRef}>
                        {children}
                    </div>

                    {/* los bordes para cambiar el tamaño */}
                    {!isMaximized && (
                        <>
                            <div className="resize-handle resize-handle-n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
                            <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
                            <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
                            <div className="resize-handle resize-handle-w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
                            <div className="resize-handle resize-handle-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                            <div className="resize-handle resize-handle-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                            <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                            <div className="resize-handle resize-handle-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default FloatingWindow;