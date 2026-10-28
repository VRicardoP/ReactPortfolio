// Permite mover una ventana flotante arrastrándola con el ratón o el dedo,
// con un ligero efecto de "bamboleo" al moverla rápido (como una pegatina),
// que se endereza solo al soltarla.

import { useCallback, useRef, useEffect } from 'react';

const MAX_SHEAR_DEGREES = 3.5;
const MAX_VERTICAL_STRETCH = 0.035;
const WOBBLE_SHEAR_GAIN = 0.18;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const useDraggable = (windowRef, isMaximized, onPositionChange) => {
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
    finalY: undefined,
    renderedX: 0,
    renderedY: 0,
    shearX: 0,
    stretchY: 1,
    wobbleEnabled: true,
    settleAnimation: null
  });

  // Aplica la posición más reciente calculada durante el arrastre,
  // junto con el pequeño efecto de inclinación/estiramiento según la
  // velocidad del movimiento, sincronizado con el refresco de pantalla.
  const applyPendingPosition = useCallback(() => {
    const dragState = dragStateRef.current;
    dragState.animationFrameId = null;

    if (!dragState.isDragging || dragState.finalX === undefined || !windowRef.current) return;

    const deltaX = dragState.finalX - dragState.startPosX;
    const deltaY = dragState.finalY - dragState.startPosY;
    const frameDeltaX = dragState.finalX - dragState.renderedX;
    const frameDeltaY = dragState.finalY - dragState.renderedY;
    dragState.renderedX = dragState.finalX;
    dragState.renderedY = dragState.finalY;

    let wobbleTransform = '';
    if (dragState.wobbleEnabled) {
      const targetShear = clamp(
        -frameDeltaX * WOBBLE_SHEAR_GAIN,
        -MAX_SHEAR_DEGREES,
        MAX_SHEAR_DEGREES,
      );
      const targetStretch = 1 + clamp(
        -frameDeltaY * 0.0025,
        -MAX_VERTICAL_STRETCH,
        MAX_VERTICAL_STRETCH
      );
      dragState.shearX += (targetShear - dragState.shearX) * 0.65;
      dragState.stretchY += (targetStretch - dragState.stretchY) * 0.65;
      wobbleTransform = ` skewX(${dragState.shearX.toFixed(2)}deg) scaleY(${dragState.stretchY.toFixed(3)})`;
    }

    // DT-138: la línea de abajo añade el efecto de "bamboleo" (shearX/scaleY
    // de arriba) al mover la ventana. La línea comentada es la versión SIN ese
    // efecto — sin tocar la posición (translate3d), que es lo único que hacía
    // antes de añadirlo. Se deja ahí a propósito: si el bamboleo da problemas
    // en algún navegador, volver a la versión simple es borrar un solo trozo
    // de texto, no reconstruir la línea desde cero.
    // windowRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    windowRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)${wobbleTransform}`;
  }, [windowRef]);

  // Se llama mientras se mueve el ratón/dedo durante el arrastre: calcula
  // la nueva posición (sin salir de la pantalla) y programa su aplicación.
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

  // Termina el arrastre: fija la posición final de verdad, deshace el
  // efecto de inclinación con una pequeña animación de "vuelta a la
  // normalidad", y avisa del cambio de posición definitivo.
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
      node.style.backdropFilter = '';
      node.classList.remove('dragging');

      const shouldSettle = dragState.wobbleEnabled &&
        typeof node.animate === 'function' &&
        (Math.abs(dragState.shearX) > 0.05 || Math.abs(dragState.stretchY - 1) > 0.002);

      if (shouldSettle) {
        const shear = dragState.shearX;
        const stretchOffset = dragState.stretchY - 1;
        const animation = node.animate([
          { transform: `skewX(${shear.toFixed(2)}deg) scaleY(${dragState.stretchY.toFixed(3)})` },
          { transform: `skewX(${(-shear * 0.32).toFixed(2)}deg) scaleY(${(1 - stretchOffset * 0.32).toFixed(3)})`, offset: 0.42 },
          { transform: 'skewX(0deg) scaleY(1)' }
        ], {
          duration: 360,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        });
        animation.id = 'window-wobble-settle';
        dragState.settleAnimation = animation;
        node.style.willChange = 'transform';

        const clearSettlingStyles = () => {
          if (dragState.settleAnimation !== animation) return;
          dragState.settleAnimation = null;
          node.style.willChange = '';
          node.style.transformOrigin = '';
        };
        // DT-138: la versión comentada de abajo solo limpiaba los estilos al
        // terminar la animación, pero en Chromium dejaba la Animation ya
        // terminada todavía "enganchada" al elemento (sin liberar memoria). La
        // versión activa añade animation.cancel() para soltarla del todo. Se
        // deja la versión simple comentada por si algún navegador se porta mal
        // con el cancel() explícito — volver atrás es un cambio de una línea.
        // animation.addEventListener('finish', clearSettlingStyles, { once: true });
        animation.addEventListener('finish', () => {
          clearSettlingStyles();
          animation.cancel();
        }, { once: true });
        animation.addEventListener('cancel', clearSettlingStyles, { once: true });
      } else {
        node.style.willChange = '';
        node.style.transformOrigin = '';
      }
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

  // Se llama al soltar el ratón/dedo: termina el arrastre.
  const handlePointerUp = useCallback((e) => {
    finishDrag(e.pointerId);
  }, [finishDrag]);

  // Se llama al pulsar sobre la ventana para empezar a arrastrarla: anota
  // la posición de partida y activa el efecto visual de arrastre.
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
    dragState.renderedX = rect.left;
    dragState.renderedY = rect.top;
    dragState.shearX = 0;
    dragState.stretchY = 1;
    dragState.wobbleEnabled = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    dragState.settleAnimation?.cancel();
    dragState.settleAnimation = null;

    node.classList.add('dragging');
    // DT-137: bringToFront causes a React className render that can remove the
    // imperative `dragging` class. Keep the compositor hints inline so that
    // render cannot disable them in the middle of the gesture.
    node.style.willChange = 'transform';
    node.style.backdropFilter = 'none';
    node.style.transformOrigin = dragState.wobbleEnabled
      ? `${e.clientX - rect.left}px ${e.clientY - rect.top}px`
      : '';
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, [isMaximized, windowRef]);

  // Al desmontar el componente, limpia cualquier animación o estilo que
  // hubiera quedado a medias de un arrastre en curso.
  useEffect(() => {
    const dragState = dragStateRef.current;
    const node = windowRef.current;
    return () => {
      if (dragState.animationFrameId !== null) {
        cancelAnimationFrame(dragState.animationFrameId);
      }
      dragState.settleAnimation?.cancel();
      dragState.settleAnimation = null;
      dragState.isDragging = false;
      node?.classList.remove('dragging');
      if (node) {
        node.style.transform = '';
        node.style.willChange = '';
        node.style.backdropFilter = '';
        node.style.transformOrigin = '';
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

// previous impl: 9af4b8d
