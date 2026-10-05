import { useCallback, useRef, useEffect } from 'react';

const useDraggable = (windowRef, isMinimized, isMaximized, onPositionChange) => {
  const dragStateRef = useRef({
    isDragging: false,
    pointerId: null,
    captureTarget: null,
    animationFrameId: null,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    finalX: undefined,
    finalY: undefined
  });

  const applyPendingPosition = useCallback(() => {
    const dragState = dragStateRef.current;
    dragState.animationFrameId = null;

    if (!dragState.isDragging || dragState.finalX === undefined || !windowRef.current) return;

    const deltaX = dragState.finalX - dragState.startPosX;
    const deltaY = dragState.finalY - dragState.startPosY;
    windowRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
  }, [windowRef]);

  const handlePointerMove = useCallback((e) => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging || e.pointerId !== dragState.pointerId) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 100;

    dragState.finalX = Math.max(0, Math.min(dragState.startPosX + deltaX, maxX));
    dragState.finalY = Math.max(0, Math.min(dragState.startPosY + deltaY, maxY));

    if (dragState.animationFrameId === null) {
      dragState.animationFrameId = requestAnimationFrame(applyPendingPosition);
    }
  }, [applyPendingPosition]);

  const finishDrag = useCallback((pointerId) => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging || pointerId !== dragState.pointerId) return;

    dragState.isDragging = false;
    if (dragState.animationFrameId !== null) {
      cancelAnimationFrame(dragState.animationFrameId);
      dragState.animationFrameId = null;
    }

    const node = windowRef.current;
    if (node) {
      if (dragState.finalX !== undefined && dragState.finalY !== undefined) {
        node.style.left = `${dragState.finalX}px`;
        node.style.top = `${dragState.finalY}px`;
      }
      node.style.transform = '';
      node.style.willChange = '';
      node.style.backdropFilter = '';
      node.classList.remove('dragging');
    }

    if (dragState.captureTarget?.hasPointerCapture?.(pointerId)) {
      dragState.captureTarget.releasePointerCapture(pointerId);
    }

    if (dragState.finalX !== undefined && dragState.finalY !== undefined) {
      onPositionChange({ x: dragState.finalX, y: dragState.finalY });
    }

    dragState.pointerId = null;
    dragState.captureTarget = null;
    dragState.finalX = undefined;
    dragState.finalY = undefined;
  }, [onPositionChange, windowRef]);

  const handlePointerUp = useCallback((e) => {
    finishDrag(e.pointerId);
  }, [finishDrag]);

  const handlePointerDown = useCallback((e) => {
    if (isMaximized || e.button !== 0 || e.target.closest?.('.control-btn')) return;

    const node = windowRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const dragState = dragStateRef.current;
    dragState.isDragging = true;
    dragState.pointerId = e.pointerId;
    dragState.captureTarget = e.currentTarget;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.startPosX = rect.left;
    dragState.startPosY = rect.top;
    dragState.finalX = undefined;
    dragState.finalY = undefined;

    node.classList.add('dragging');
    // DT-137: bringToFront causes a React className render that can remove the
    // imperative `dragging` class. Keep the compositor hints inline so that
    // render cannot disable them in the middle of the gesture.
    node.style.willChange = 'transform';
    node.style.backdropFilter = 'none';
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, [isMaximized, windowRef]);

  useEffect(() => {
    const dragState = dragStateRef.current;
    const node = windowRef.current;
    return () => {
      if (dragState.animationFrameId !== null) {
        cancelAnimationFrame(dragState.animationFrameId);
      }
      dragState.isDragging = false;
      /* DT-137: se conservan comentadas las lecturas anteriores del ref. React
         puede haber cambiado `windowRef.current` antes de ejecutar el cleanup,
         por lo que podrían limpiar otro nodo y el linter las invalida.
      windowRef.current?.classList.remove('dragging');
      if (windowRef.current) windowRef.current.style.transform = '';
      */
      node?.classList.remove('dragging');
      if (node) {
        node.style.transform = '';
        node.style.willChange = '';
        node.style.backdropFilter = '';
      }
    };
  }, [windowRef]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: handlePointerUp,
    handleLostPointerCapture: handlePointerUp
  };
};

export default useDraggable;

/* DT-137: implementación anterior conservada. Se comenta porque cada
   `mousemove` escribía `left`/`top`, forzaba layout y registraba listeners
   globales; la implementación activa usa Pointer Events, captura y un
   `translate3d` agrupado mediante requestAnimationFrame.

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
*/
