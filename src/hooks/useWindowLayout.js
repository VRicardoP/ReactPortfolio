import { useEffect, useRef, useCallback } from 'react';
import { useWindowContext } from '../context/WindowContext';
import { showToast } from '../components/UI/Toast';
import i18n from '../i18n';

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
    const pillWidth = isMobile ? 140 : 180;
    const pillGap = isMobile ? 6 : 10;
    const maxRowWidth = screenWidth * 0.92;
    const perRow = Math.max(1, Math.floor((maxRowWidth + pillGap) / (pillWidth + pillGap)));
    const menuY = isMobile ? 70 : 110;
    const rowHeight = isMobile ? 42 : 48;

    timerIdsRef.current = [];

    windowIds.forEach((windowId, index) => {
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      const itemsInRow = Math.min(perRow, windowIds.length - row * perRow);
      const rowWidth = itemsInRow * pillWidth + (itemsInRow - 1) * pillGap;
      const rowStartX = (screenWidth - rowWidth) / 2;

      const position = {
        x: rowStartX + col * (pillWidth + pillGap),
        y: menuY + row * rowHeight
      };

      const outerTimerId = setTimeout(() => {
        updatePosition(windowId, position);

        const innerTimerId = setTimeout(() => {
          toggleMinimize(windowId);

          if (index === windowIds.length - 1) {
            showToast(i18n.t('toast.exploreWindows'), 3000);
            hasAnimated.current = true;
          }
        }, 200);
        timerIdsRef.current.push(innerTimerId);
      }, 300 + index * 60);
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
      const screenWidth = window.innerWidth;
      const isMobile = screenWidth <= 768;
      const pillWidth = isMobile ? 140 : 180;
      const pillGap = isMobile ? 6 : 10;
      const maxRowWidth = screenWidth * 0.92;
      const perRow = Math.max(1, Math.floor((maxRowWidth + pillGap) / (pillWidth + pillGap)));
      const menuY = isMobile ? 70 : 110;
      const rowHeight = isMobile ? 42 : 48;

      windowIds.forEach((windowId, index) => {
        const win = windows[windowId];
        if (win && win.isMinimized) {
          const row = Math.floor(index / perRow);
          const col = index % perRow;
          const itemsInRow = Math.min(perRow, windowIds.length - row * perRow);
          const rowWidth = itemsInRow * pillWidth + (itemsInRow - 1) * pillGap;
          const rowStartX = (screenWidth - rowWidth) / 2;

          updatePosition(windowId, {
            x: rowStartX + col * (pillWidth + pillGap),
            y: menuY + row * rowHeight
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