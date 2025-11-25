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

    // no dejo que se salga de la pantalla
    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 100;

    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));

    // muevo la ventana directamente para que sea mas fluido
    if (windowRef.current) {
      windowRef.current.style.left = `${clampedX}px`;
      windowRef.current.style.top = `${clampedY}px`;
    }

    // guardo donde quedo para despues
    dragState.finalX = clampedX;
    dragState.finalY = clampedY;
  }, [windowRef]);

  const handleMouseUp = useCallback(() => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging) return;

    dragState.isDragging = false;

    // quito el estilo de arrastre
    if (windowRef.current) {
      windowRef.current.classList.remove('dragging');
    }

    // ahora si guardo la posicion final
    if (dragState.finalX !== undefined && dragState.finalY !== undefined) {
      onPositionChange({ x: dragState.finalX, y: dragState.finalY });
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, onPositionChange, windowRef]);

  const handleMouseDown = useCallback((e) => {
    // si esta maximizada no se puede mover
    if (isMaximized) return;

    // solo funciona con el click izquierdo
    if (e.button !== 0) return;

    // si es un boton de minimizar o maximizar no arrastro
    if (e.target.classList.contains('control-btn')) return;

    // pongo la ventana delante cuando empiezo a arrastrar
    onBringToFront();

    const dragState = dragStateRef.current;
    dragState.isDragging = true;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;

    // miro donde esta la ventana ahora
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      dragState.startPosX = rect.left;
      dragState.startPosY = rect.top;

      // pongo una clase para que no haga animaciones raras
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