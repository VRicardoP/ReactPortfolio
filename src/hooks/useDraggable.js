import { useCallback, useRef, useEffect } from 'react';

const MAX_SHEAR_DEGREES = 3.5;
const MAX_VERTICAL_STRETCH = 0.035;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

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
    finalY: undefined,
    renderedX: 0,
    renderedY: 0,
    shearX: 0,
    stretchY: 1,
    wobbleEnabled: true,
    settleAnimation: null
  });

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
      const targetShear = clamp(-frameDeltaX * 0.18, -MAX_SHEAR_DEGREES, MAX_SHEAR_DEGREES);
      const targetStretch = 1 + clamp(
        -frameDeltaY * 0.0025,
        -MAX_VERTICAL_STRETCH,
        MAX_VERTICAL_STRETCH
      );
      dragState.shearX += (targetShear - dragState.shearX) * 0.65;
      dragState.stretchY += (targetStretch - dragState.stretchY) * 0.65;
      wobbleTransform = ` skewX(${dragState.shearX.toFixed(2)}deg) scaleY(${dragState.stretchY.toFixed(3)})`;
    }

    // DT-138: the translation-only assignment is preserved as the exact
    // rollback behavior. The active line appends compositor-only deformation.
    // windowRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    windowRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)${wobbleTransform}`;
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
        // DT-138: the direct finish listener is preserved as reference. It
        // cleaned styles but left the finished Animation attached in Chromium.
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
