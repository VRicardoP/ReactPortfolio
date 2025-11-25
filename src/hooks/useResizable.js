import { useCallback, useRef } from 'react';

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

    const minWidth = 200;
    const minHeight = 150;

    const direction = resizeState.direction;

    // si arrastro a la derecha o izquierda
    if (direction.includes('e')) {
      newWidth = Math.max(resizeState.startWidth + deltaX, minWidth);
    } else if (direction.includes('w')) {
      const proposedWidth = resizeState.startWidth - deltaX;
      if (proposedWidth >= minWidth) {
        newWidth = proposedWidth;
        newX = resizeState.startPosX + deltaX;
      }
    }

    // si arrastro arriba o abajo
    if (direction.includes('s')) {
      newHeight = Math.max(resizeState.startHeight + deltaY, minHeight);
    } else if (direction.includes('n')) {
      const proposedHeight = resizeState.startHeight - deltaY;
      if (proposedHeight >= minHeight) {
        newHeight = proposedHeight;
        newY = resizeState.startPosY + deltaY;
      }
    }

    // cambio el tamaño directamente para que sea fluido
    if (windowRef.current) {
      windowRef.current.style.width = `${newWidth}px`;
      windowRef.current.style.height = `${newHeight}px`;
      windowRef.current.style.left = `${newX}px`;
      windowRef.current.style.top = `${newY}px`;
    }

    // guardo el tamaño final
    resizeState.finalWidth = newWidth;
    resizeState.finalHeight = newHeight;
    resizeState.finalX = newX;
    resizeState.finalY = newY;
  }, [windowRef]);

  const handleResizeEnd = useCallback(() => {
    const resizeState = resizeStateRef.current;
    if (!resizeState.isResizing) return;

    resizeState.isResizing = false;

    // quito el estilo de redimensionar
    if (windowRef.current) {
      windowRef.current.classList.remove('resizing');
    }

    // guardo el nuevo tamaño en el estado
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

      // pongo una clase para que no haga animaciones raras
      windowRef.current.classList.add('resizing');
    }

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [isMinimized, isMaximized, windowRef, handleResizeMove, handleResizeEnd]);

  return {
    handleResizeStart,
    isResizing: resizeStateRef.current.isResizing
  };
};

export default useResizable;