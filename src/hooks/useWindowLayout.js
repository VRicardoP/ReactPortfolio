import { useEffect, useRef, useCallback } from 'react';
import { useWindowContext } from '../context/WindowContext';
import { showToast } from '../components/UI/Toast';

const useWindowLayout = (windowIds, delay = 3000) => {
  const { windows, toggleMinimize, updatePosition } = useWindowContext();
  const hasAnimated = useRef(false);
  const animationStartedRef = useRef(false);
  const timeoutRef = useRef(null);
  const timerIdsRef = useRef([]);

  // the function that animates minimizing the windows
  const animateWindows = useCallback(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isMobile = screenWidth <= 768;
    const isTablet = screenWidth > 768 && screenWidth <= 1200;

    // First, position windows in a visible grid before minimizing (F33)
    const cols = isMobile ? 1 : isTablet ? 2 : 3;
    const gridPadding = 20;
    const headerOffset = isMobile ? 70 : 110;
    const cellWidth = (screenWidth - gridPadding * 2) / cols;
    const cellHeight = Math.min(320, (screenHeight - headerOffset - gridPadding) / Math.ceil(windowIds.length / cols));

    windowIds.forEach((windowId, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      updatePosition(windowId, {
        x: gridPadding + col * cellWidth + 10,
        y: headerOffset + row * cellHeight + 10,
      });
    });

    // Then minimize them after a brief pause
    const itemWidth = isMobile ? 140 : 200;
    const menuWidth = Math.min(screenWidth * 0.85, windowIds.length * itemWidth);
    const startX = Math.max(10, (screenWidth - menuWidth) / 2);
    const itemSpacing = menuWidth / windowIds.length;
    const menuY = isMobile ? 70 : 125;

    timerIdsRef.current = [];

    windowIds.forEach((windowId, index) => {
      const position = {
        x: startX + (index * itemSpacing),
        y: menuY
      };

      const outerTimerId = setTimeout(() => {
        updatePosition(windowId, position);

        const innerTimerId = setTimeout(() => {
          toggleMinimize(windowId);

          if (index === windowIds.length - 1) {
            showToast('Click on any window to explore!', 3000);
            hasAnimated.current = true;
          }
        }, 500);
        timerIdsRef.current.push(innerTimerId);
      }, 800 + index * 100);
      timerIdsRef.current.push(outerTimerId);
    });
  }, [windowIds, toggleMinimize, updatePosition]);

  // Clean up all timers on unmount only
  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach(clearTimeout);
      timerIdsRef.current = [];
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // if animation already ran or is in progress, don't restart
    if (hasAnimated.current || animationStartedRef.current) return;

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
    timeoutRef.current = setTimeout(() => {
      animationStartedRef.current = true;
      animateWindows();
    }, delay);
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