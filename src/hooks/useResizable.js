// Permite cambiar el tamaño de una ventana flotante arrastrando sus bordes
// con ratón o dedo, o con las flechas del teclado, en las 8 direcciones.

import { useCallback, useRef, useEffect } from 'react';

const KEYBOARD_RESIZE_STEP = 10;
const KEYBOARD_RESIZE_LARGE_STEP = 50;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

const useResizable = (windowRef, isMinimized, isMaximized, onSizeChange, onPositionChange) => {
  const resizeStateRef = useRef({
    isResizing: false,
    pointerId: null,
    captureTarget: null,
    direction: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startPosX: 0,
    startPosY: 0,
    finalWidth: undefined,
    finalHeight: undefined,
    finalX: undefined,
    finalY: undefined,
  });

  const handlePointerMove = useCallback((event) => {
    const state = resizeStateRef.current;
    if (!state.isResizing || event.pointerId !== state.pointerId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    let width = state.startWidth;
    let height = state.startHeight;
    let x = state.startPosX;
    let y = state.startPosY;

    if (state.direction.includes('e')) {
      width = Math.max(state.startWidth + deltaX, MIN_WIDTH);
    } else if (state.direction.includes('w')) {
      const proposedWidth = state.startWidth - deltaX;
      if (proposedWidth >= MIN_WIDTH) {
        width = proposedWidth;
        x = state.startPosX + deltaX;
      }
    }

    if (state.direction.includes('s')) {
      height = Math.max(state.startHeight + deltaY, MIN_HEIGHT);
    } else if (state.direction.includes('n')) {
      const proposedHeight = state.startHeight - deltaY;
      if (proposedHeight >= MIN_HEIGHT) {
        height = proposedHeight;
        y = state.startPosY + deltaY;
      }
    }

    if (windowRef.current) {
      windowRef.current.style.width = `${width}px`;
      windowRef.current.style.height = `${height}px`;
      windowRef.current.style.left = `${x}px`;
      windowRef.current.style.top = `${y}px`;
    }

    state.finalWidth = width;
    state.finalHeight = height;
    state.finalX = x;
    state.finalY = y;
  }, [windowRef]);

  const finishResize = useCallback((pointerId) => {
    const state = resizeStateRef.current;
    if (!state.isResizing || pointerId !== state.pointerId) return;

    state.isResizing = false;
    windowRef.current?.classList.remove('resizing');
    if (state.captureTarget?.hasPointerCapture?.(pointerId)) {
      state.captureTarget.releasePointerCapture(pointerId);
    }
    if (state.finalWidth !== undefined) {
      onSizeChange({ width: state.finalWidth, height: state.finalHeight });
    }
    if (state.finalX !== state.startPosX || state.finalY !== state.startPosY) {
      onPositionChange({ x: state.finalX, y: state.finalY });
    }

    state.pointerId = null;
    state.captureTarget = null;
    state.direction = null;
  }, [onSizeChange, onPositionChange, windowRef]);

  const handlePointerUp = useCallback((event) => {
    finishResize(event.pointerId);
  }, [finishResize]);

  const handlePointerDown = useCallback((event, direction) => {
    if (isMinimized || isMaximized || event.button !== 0 || !windowRef.current) return;

    event.stopPropagation();
    event.preventDefault();

    const rect = windowRef.current.getBoundingClientRect();
    const state = resizeStateRef.current;
    state.isResizing = true;
    state.pointerId = event.pointerId;
    state.captureTarget = event.currentTarget;
    state.direction = direction;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.startWidth = rect.width;
    state.startHeight = rect.height;
    state.startPosX = rect.left;
    state.startPosY = rect.top;
    state.finalWidth = undefined;
    state.finalHeight = undefined;
    state.finalX = rect.left;
    state.finalY = rect.top;

    windowRef.current.classList.add('resizing');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [isMinimized, isMaximized, windowRef]);

  useEffect(() => {
    const state = resizeStateRef.current;
    const node = windowRef.current;
    return () => {
      state.isResizing = false;
      node?.classList.remove('resizing');
    };
  }, [windowRef]);

  const handleKeyboardResize = useCallback((event, direction) => {
    if (isMinimized || isMaximized) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();
    if (!windowRef.current) return;

    const step = event.shiftKey ? KEYBOARD_RESIZE_LARGE_STEP : KEYBOARD_RESIZE_STEP;
    const rect = windowRef.current.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;
    let x = rect.left;
    let y = rect.top;

    if (direction.includes('e')) {
      if (event.key === 'ArrowRight') width = rect.width + step;
      if (event.key === 'ArrowLeft') width = Math.max(rect.width - step, MIN_WIDTH);
    }
    if (direction.includes('w')) {
      if (event.key === 'ArrowLeft') { width = rect.width + step; x = rect.left - step; }
      if (event.key === 'ArrowRight' && rect.width - step >= MIN_WIDTH) { width = rect.width - step; x = rect.left + step; }
    }
    if (direction.includes('s')) {
      if (event.key === 'ArrowDown') height = rect.height + step;
      if (event.key === 'ArrowUp') height = Math.max(rect.height - step, MIN_HEIGHT);
    }
    if (direction.includes('n')) {
      if (event.key === 'ArrowUp') { height = rect.height + step; y = rect.top - step; }
      if (event.key === 'ArrowDown' && rect.height - step >= MIN_HEIGHT) { height = rect.height - step; y = rect.top + step; }
    }

    windowRef.current.style.width = `${width}px`;
    windowRef.current.style.height = `${height}px`;
    windowRef.current.style.left = `${x}px`;
    windowRef.current.style.top = `${y}px`;
    if (width !== rect.width || height !== rect.height) onSizeChange({ width, height });
    if (x !== rect.left || y !== rect.top) onPositionChange({ x, y });
  }, [isMinimized, isMaximized, windowRef, onSizeChange, onPositionChange]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: handlePointerUp,
    handleLostPointerCapture: handlePointerUp,
    handleKeyboardResize,
  };
};

export default useResizable;
