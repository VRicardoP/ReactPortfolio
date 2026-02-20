import { useCallback, useRef, useEffect } from 'react';

const useDraggable = (windowRef, isMinimized, isMaximized, onPositionChange, onBringToFront) => {
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0
  });

  const handleMouseMove = useCallback((e) => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const newX = dragState.startPosX + deltaX;
    const newY = dragState.startPosY + deltaY;

    // don't let it go off screen
    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 100;

    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    // move the window directly so it feels smoother
    if (windowRef.current) {
      windowRef.current.style.left = `${clampedX}px`;
      windowRef.current.style.top = `${clampedY}px`;
    }

    // save where it ended up for later
    dragState.finalX = clampedX;
    dragState.finalY = clampedY;
  }, [windowRef]);

  const handleMouseUp = useCallback(() => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging) return;

    dragState.isDragging = false;

    // remove the dragging style
    if (windowRef.current) {
      windowRef.current.classList.remove('dragging');
    }

    // now save the final position
    if (dragState.finalX !== undefined && dragState.finalY !== undefined) {
      onPositionChange({ x: dragState.finalX, y: dragState.finalY });
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, onPositionChange, windowRef]);

  const handleMouseDown = useCallback((e) => {
    // if it's maximized it can't be moved
    if (isMaximized) return;

    // only works with left click
    if (e.button !== 0) return;

    // if it's a minimize or maximize button don't drag
    if (e.target.classList.contains('control-btn')) return;

    // bring the window to front when I start dragging
    onBringToFront();

    const dragState = dragStateRef.current;
    dragState.isDragging = true;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;

    // check where the window is now
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      dragState.startPosX = rect.left;
      dragState.startPosY = rect.top;

      // add a class to prevent weird animations
      windowRef.current.classList.add('dragging');
    }

    e.preventDefault();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isMaximized, onBringToFront, windowRef, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const dragState = dragStateRef.current;
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      dragState.isDragging = false;
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    handleMouseDown
  };
};

export default useDraggable;