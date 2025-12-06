import { useEffect, useRef, useCallback } from 'react';
import { useWindowContext } from '../context/WindowContext';
import { showToast } from '../components/UI/Toast';

const useWindowLayout = (windowIds, delay = 3000) => {
  const { windows, toggleMinimize, updatePosition } = useWindowContext();
  const hasAnimated = useRef(false);
  const timeoutRef = useRef(null);

  // la funcion que hace la animacion de minimizar las ventanas
  const animateWindows = useCallback(() => {
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;

    // calculo el tamaño dependiendo de si es movil o no
    const itemWidth = isMobile ? 140 : 200;
    const menuWidth = Math.min(screenWidth * 0.85, windowIds.length * itemWidth);
    const startX = Math.max(10, (screenWidth - menuWidth) / 2);
    const itemSpacing = menuWidth / windowIds.length;
    const menuY = isMobile ? 70 : 125;

    windowIds.forEach((windowId, index) => {
      const position = {
        x: startX + (index * itemSpacing),
        y: menuY
      };

      setTimeout(() => {
        updatePosition(windowId, position);

        setTimeout(() => {
          toggleMinimize(windowId);

          if (index === windowIds.length - 1) {
            showToast('Click on any window to explore!', 3000);
            hasAnimated.current = true;
          }
        }, 500);
      }, index * 100);
    });
  }, [windowIds, toggleMinimize, updatePosition]);

  useEffect(() => {
    // si ya hice la animacion no la repito
    if (hasAnimated.current) return;

    // espero a que todas las ventanas esten listas
    const allRegistered = windowIds.every(id => windows[id]);
    if (!allRegistered) {
      return;
    }

    // borro el temporizador anterior si habia uno
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // despues de un rato minimizo todas las ventanas
    timeoutRef.current = setTimeout(animateWindows, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [windows, windowIds, delay, animateWindows]);

  // si cambia el tamaño de la pantalla recoloco las ventanas
  useEffect(() => {
    if (!hasAnimated.current) return;

    const handleResize = () => {
      // muevo las ventanas minimizadas a su nueva posicion
      const screenWidth = window.innerWidth;
      const isMobile = screenWidth <= 768;
      const itemWidth = isMobile ? 140 : 200;
      const menuWidth = Math.min(screenWidth * 0.85, windowIds.length * itemWidth);
      const startX = Math.max(10, (screenWidth - menuWidth) / 2);
      const itemSpacing = menuWidth / windowIds.length;
      const menuY = isMobile ? 70 : 100;

      windowIds.forEach((windowId, index) => {
        const window = windows[windowId];
        if (window && window.isMinimized) {
          updatePosition(windowId, {
            x: startX + (index * itemSpacing),
            y: menuY
          });
        }
      });
    };

    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [windows, windowIds, updatePosition]);
};

export default useWindowLayout;