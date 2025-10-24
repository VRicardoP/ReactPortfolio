import { useEffect, useRef } from 'react';
import { useWindowContext } from '../context/WindowContext';
import { showToast } from '../components/UI/Toast';

const useWindowLayout = (windowIds, delay = 3000) => {
  const { windows, toggleMinimize, updatePosition } = useWindowContext();
  const hasAnimated = useRef(false);

  useEffect(() => {
    // No animar si ya se hizo
    if (hasAnimated.current) return;

    // Esperar a que TODAS las ventanas estén registradas
    const allRegistered = windowIds.every(id => windows[id]);
    if (!allRegistered) {
      console.log('Esperando a que se registren todas las ventanas...',
        windowIds.filter(id => !windows[id]));
      return;
    }

    console.log('Todas las ventanas registradas. Iniciando animación en', delay, 'ms');

    // Después del delay, minimizar y posicionar en menú
    const timer = setTimeout(() => {
      const screenWidth = window.innerWidth;
      const menuWidth = Math.min(screenWidth * 0.8, windowIds.length * 200);
      const startX = (screenWidth - menuWidth) / 2;
      const itemSpacing = menuWidth / windowIds.length;
      const menuY = 100;

      windowIds.forEach((windowId, index) => {
        // Posicionar en el menú
        const position = {
          x: startX + (index * itemSpacing),
          y: menuY
        };

        // Pequeño delay escalonado para efecto visual
        setTimeout(() => {
          updatePosition(windowId, position);

          // Minimizar después de mover
          setTimeout(() => {
            toggleMinimize(windowId);

            // Toast solo para la última ventana
            if (index === windowIds.length - 1) {
              showToast('Click on any window to explore!', 3000);
              hasAnimated.current = true;
            }
          }, 500);
        }, index * 100);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [windows, windowIds, delay, toggleMinimize, updatePosition]);
};

export default useWindowLayout;