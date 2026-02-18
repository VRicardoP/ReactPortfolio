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

    // when the window is created register it in the system (runs once on mount)
    useEffect(() => {
        registerWindow(id, {
            position: initialPosition,
            size: initialSize,
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
    const handleBringToFront = useCallback(() => bringToFront(id), [id, bringToFront]);

    // this allows dragging and resizing the window
    const { handleMouseDown: handleDragStart } = useDraggable(
        windowRef,
        windowState?.isMinimized,
        windowState?.isMaximized,
        handlePositionChange,
        handleBringToFront
    );

    const { handleResizeStart } = useResizable(
        windowRef,
        windowState?.isMinimized,
        windowState?.isMaximized,
        handleSizeChange,
        handlePositionChange
    );

    // if I click on the window bring it to the front
    const handleWindowClick = (e) => {
        // if it's a minimize or maximize button don't do anything here
        if (e.target.classList.contains('control-btn')) {
            return;
        }
        bringToFront(id);
    };

    // when I minimize or restore the window
    const handleToggleMinimize = (e) => {
        e.stopPropagation();
        toggleMinimize(id);
        // if it was minimized bring it to front when restoring
        if (windowState?.isMinimized) {
            setTimeout(() => bringToFront(id), 100);
        }
    };

    // when maximizing from minimized, fit to content
    const handleToggleMaximize = useCallback((e) => {
        e.stopPropagation();

        // if minimized, fit to optimal content size
        if (windowState?.isMinimized) {
            // use the initial size as reference for the content
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

                    {/* borders for resizing */}
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