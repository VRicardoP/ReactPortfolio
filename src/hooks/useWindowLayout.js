import { useEffect } from 'react';
import { useWindowContext } from '../context/WindowContext';
import { showToast } from '../components/UI/Toast';

const useWindowLayout = (windowIds, delay = 3000) => {
  const { windows, toggleMinimize, updatePosition } = useWindowContext();

  useEffect(() => {
    // Esperar a que todas las ventanas estén registradas
    const allRegistered = windowIds.every(id => windows[id]);
    if (!allRegistered) return;

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
            }
          }, 500);
        }, index * 100);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [windows, windowIds, delay, toggleMinimize, updatePosition]);
};

export default useWindowLayout;