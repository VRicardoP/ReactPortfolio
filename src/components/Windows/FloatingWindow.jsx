import { useEffect, useRef } from 'react';
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
    const {
        windows,
        registerWindow,
        unregisterWindow,
        bringToFront,
        toggleMinimize,
        toggleMaximize,
        updatePosition,
        updateSize
    } = useWindowContext();

    const windowState = windows[id];

    // Registrar ventana al montar
    useEffect(() => {
        registerWindow(id, {
            position: initialPosition,
            size: initialSize,
            isMinimized: false,
            isMaximized: false
        });

        return () => unregisterWindow(id);
    }, [id, registerWindow, unregisterWindow]);

    // Hooks para drag y resize (pasamos windowRef)
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
        (pos) => updatePosition(id, pos)
    );

    if (!windowState) return null;

    const { position, size, zIndex, isMinimized, isMaximized } = windowState;

    const windowStyle = {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '180px' : isMaximized ? '100vw' : `${size.width}px`,
        height: isMinimized ? '40px' : isMaximized ? '100vh' : `${size.height}px`,
        zIndex
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
        >
            <div
                className="window-header"
                onMouseDown={handleDragStart}
            >
                <div className="window-controls">
                    <Tooltip text="Minimize" position="bottom">
                        <button
                            className="control-btn control-minimize"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleMinimize(id);
                            }}
                        />
                    </Tooltip>
                    <Tooltip text="Maximize" position="bottom">
                        <button
                            className="control-btn control-maximize"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleMaximize(id);
                            }}
                        />
                    </Tooltip>
                </div>
                <div className="window-title">{title}</div>
            </div>

            {!isMinimized && (
                <>
                    <div className="window-content">
                        {children}
                    </div>

                    {/* Resize handles */}
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