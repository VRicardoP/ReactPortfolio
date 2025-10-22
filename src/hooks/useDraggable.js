import { useCallback, useRef } from 'react';

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

    // Limitar a los bordes de la ventana
    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 100;

    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    // Actualizar DOM directamente (sin re-render)
    if (windowRef.current) {
      windowRef.current.style.left = `${clampedX}px`;
      windowRef.current.style.top = `${clampedY}px`;
    }

    // Guardar posición final para actualizar el Context
    dragState.finalX = clampedX;
    dragState.finalY = clampedY;
  }, [windowRef]);

  const handleMouseUp = useCallback(() => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging) return;

    dragState.isDragging = false;

    // Remover clase dragging
    if (windowRef.current) {
      windowRef.current.classList.remove('dragging');
    }

    // Ahora sí actualizar el Context con la posición final
    if (dragState.finalX !== undefined && dragState.finalY !== undefined) {
      onPositionChange({ x: dragState.finalX, y: dragState.finalY });
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, onPositionChange, windowRef]);

  const handleMouseDown = useCallback((e) => {
    // No arrastrar si está maximizada
    if (isMaximized) return;

    // Solo arrastrar con click izquierdo
    if (e.button !== 0) return;

    // Traer al frente
    onBringToFront();

    const dragState = dragStateRef.current;
    dragState.isDragging = true;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;

    // Obtener posición actual del elemento
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      dragState.startPosX = rect.left;
      dragState.startPosY = rect.top;

      // Añadir clase dragging para desactivar transiciones
      windowRef.current.classList.add('dragging');
    }

    e.preventDefault();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isMaximized, onBringToFront, windowRef, handleMouseMove, handleMouseUp]);

  return {
    handleMouseDown,
    isDragging: dragStateRef.current.isDragging
  };
};

export default useDraggable;