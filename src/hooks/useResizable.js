import { useCallback, useRef, useEffect } from 'react';

const KEYBOARD_RESIZE_STEP = 10;
const KEYBOARD_RESIZE_LARGE_STEP = 50;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

const useResizable = (windowRef, isMinimized, isMaximized, onSizeChange, onPositionChange) => {
  const resizeStateRef = useRef({
    isResizing: false,
    direction: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startPosX: 0,
    startPosY: 0
  });

  const handleResizeMove = useCallback((e) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState.isResizing) return;

    const deltaX = e.clientX - resizeState.startX;
    const deltaY = e.clientY - resizeState.startY;

    let newWidth = resizeState.startWidth;
    let newHeight = resizeState.startHeight;
    let newX = resizeState.startPosX;
    let newY = resizeState.startPosY;

    const minWidth = MIN_WIDTH;
    const minHeight = MIN_HEIGHT;

    const direction = resizeState.direction;

    // if dragging right or left
    if (direction.includes('e')) {
      newWidth = Math.max(resizeState.startWidth + deltaX, minWidth);
    } else if (direction.includes('w')) {
      const proposedWidth = resizeState.startWidth - deltaX;
      if (proposedWidth >= minWidth) {
        newWidth = proposedWidth;
        newX = resizeState.startPosX + deltaX;
      }
    }

    // if dragging up or down
    if (direction.includes('s')) {
      newHeight = Math.max(resizeState.startHeight + deltaY, minHeight);
    } else if (direction.includes('n')) {
      const proposedHeight = resizeState.startHeight - deltaY;
      if (proposedHeight >= minHeight) {
        newHeight = proposedHeight;
        newY = resizeState.startPosY + deltaY;
      }
    }

    // change the size directly so it feels smooth
    if (windowRef.current) {
      windowRef.current.style.width = `${newWidth}px`;
      windowRef.current.style.height = `${newHeight}px`;
      windowRef.current.style.left = `${newX}px`;
      windowRef.current.style.top = `${newY}px`;
    }

    // save the final size
    resizeState.finalWidth = newWidth;
    resizeState.finalHeight = newHeight;
    resizeState.finalX = newX;
    resizeState.finalY = newY;
  }, [windowRef]);

  const handleResizeEnd = useCallback(() => {
    const resizeState = resizeStateRef.current;
    if (!resizeState.isResizing) return;

    resizeState.isResizing = false;

    // remove the resizing style
    if (windowRef.current) {
      windowRef.current.classList.remove('resizing');
    }

    // save the new size in state
    if (resizeState.finalWidth !== undefined) {
      onSizeChange({
        width: resizeState.finalWidth,
        height: resizeState.finalHeight
      });
    }

    if (resizeState.finalX !== resizeState.startPosX ||
      resizeState.finalY !== resizeState.startPosY) {
      onPositionChange({
        x: resizeState.finalX,
        y: resizeState.finalY
      });
    }

    resizeState.direction = null;

    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove, onSizeChange, onPositionChange, windowRef]);

  const handleResizeStart = useCallback((e, direction) => {
    if (isMinimized || isMaximized) return;

    e.stopPropagation();
    e.preventDefault();

    const resizeState = resizeStateRef.current;
    resizeState.isResizing = true;
    resizeState.direction = direction;
    resizeState.startX = e.clientX;
    resizeState.startY = e.clientY;

    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      resizeState.startWidth = rect.width;
      resizeState.startHeight = rect.height;
      resizeState.startPosX = rect.left;
      resizeState.startPosY = rect.top;

      // add a class to prevent weird animations
      windowRef.current.classList.add('resizing');
    }

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [isMinimized, isMaximized, windowRef, handleResizeMove, handleResizeEnd]);

  useEffect(() => {
    const resizeState = resizeStateRef.current;
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      resizeState.isResizing = false;
    };
  }, [handleResizeMove, handleResizeEnd]);

  const handleKeyboardResize = useCallback((e, direction) => {
    if (isMinimized || isMaximized) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    if (!windowRef.current) return;
    const step = e.shiftKey ? KEYBOARD_RESIZE_LARGE_STEP : KEYBOARD_RESIZE_STEP;
    const rect = windowRef.current.getBoundingClientRect();

    let newWidth = rect.width;
    let newHeight = rect.height;
    let newX = rect.left;
    let newY = rect.top;

    if (direction.includes('e')) {
      if (e.key === 'ArrowRight') newWidth = rect.width + step;
      if (e.key === 'ArrowLeft') newWidth = Math.max(rect.width - step, MIN_WIDTH);
    }
    if (direction.includes('w')) {
      if (e.key === 'ArrowLeft') { newWidth = rect.width + step; newX = rect.left - step; }
      if (e.key === 'ArrowRight' && rect.width - step >= MIN_WIDTH) { newWidth = rect.width - step; newX = rect.left + step; }
    }
    if (direction.includes('s')) {
      if (e.key === 'ArrowDown') newHeight = rect.height + step;
      if (e.key === 'ArrowUp') newHeight = Math.max(rect.height - step, MIN_HEIGHT);
    }
    if (direction.includes('n')) {
      if (e.key === 'ArrowUp') { newHeight = rect.height + step; newY = rect.top - step; }
      if (e.key === 'ArrowDown' && rect.height - step >= MIN_HEIGHT) { newHeight = rect.height - step; newY = rect.top + step; }
    }

    windowRef.current.style.width = `${newWidth}px`;
    windowRef.current.style.height = `${newHeight}px`;
    windowRef.current.style.left = `${newX}px`;
    windowRef.current.style.top = `${newY}px`;

    if (newWidth !== rect.width || newHeight !== rect.height) {
      onSizeChange({ width: newWidth, height: newHeight });
    }
    if (newX !== rect.left || newY !== rect.top) {
      onPositionChange({ x: newX, y: newY });
    }
  }, [isMinimized, isMaximized, windowRef, onSizeChange, onPositionChange]);

  return {
    handleResizeStart,
    handleKeyboardResize,
  };
};

export default useResizable;