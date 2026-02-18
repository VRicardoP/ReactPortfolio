import { useEffect, useRef, useCallback } from 'react';
import { useWindowContext } from '../context/WindowContext';
import { showToast } from '../components/UI/Toast';

const useWindowLayout = (windowIds, delay = 3000) => {
  const { windows, toggleMinimize, updatePosition } = useWindowContext();
  const hasAnimated = useRef(false);
  const timeoutRef = useRef(null);

  // the function that animates minimizing the windows
  const animateWindows = useCallback(() => {
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 768;

    // calculate the size depending on whether it's mobile or not
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
    // if I already did the animation don't repeat it
    if (hasAnimated.current) return;

    // wait for all windows to be ready
    const allRegistered = windowIds.every(id => windows[id]);
    if (!allRegistered) {
      return;
    }

    // clear the previous timer if there was one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // after a while minimize all windows
    timeoutRef.current = setTimeout(animateWindows, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [windows, windowIds, delay, animateWindows]);

  // if the screen size changes reposition the windows
  useEffect(() => {
    if (!hasAnimated.current) return;

    const handleResize = () => {
      // move minimized windows to their new position
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