import { useEffect, useRef, useCallback } from 'react';
import { useWindowContext } from '../context/WindowContext';
import { showToast } from '../components/UI/Toast';
import i18n from '../i18n';

// Responsive breakpoints (px)
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1200;

// Grid layout for pre-minimize positioning
const GRID_PADDING = 20;
const GRID_CELL_INSET = 10;
const MAX_CELL_HEIGHT = 320;

// Header offset accounts for top navbar height
const HEADER_OFFSET_MOBILE = 70;
const HEADER_OFFSET_DESKTOP = 110;

// Minimized pill dimensions
const PILL_WIDTH_MOBILE = 140;
const PILL_WIDTH_DESKTOP = 180;
const PILL_GAP_MOBILE = 6;
const PILL_GAP_DESKTOP = 10;
const ROW_HEIGHT_MOBILE = 42;
const ROW_HEIGHT_DESKTOP = 48;

// Max fraction of screen width used for pill rows
const MAX_ROW_WIDTH_RATIO = 0.92;

// Animation timing (ms)
const MINIMIZE_DELAY_BASE = 300;
const MINIMIZE_STAGGER_PER_WINDOW = 60;
const POSITION_TO_MINIMIZE_DELAY = 200;
const TOAST_DURATION = 3000;
const RESIZE_DEBOUNCE_DELAY = 250;

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
    const isMobile = screenWidth <= MOBILE_BREAKPOINT;
    const isTablet = screenWidth > MOBILE_BREAKPOINT && screenWidth <= TABLET_BREAKPOINT;

    // First, position windows in a visible grid before minimizing (F33)
    const cols = isMobile ? 1 : isTablet ? 2 : 3;
    const headerOffset = isMobile ? HEADER_OFFSET_MOBILE : HEADER_OFFSET_DESKTOP;
    const cellWidth = (screenWidth - GRID_PADDING * 2) / cols;
    const cellHeight = Math.min(MAX_CELL_HEIGHT, (screenHeight - headerOffset - GRID_PADDING) / Math.ceil(windowIds.length / cols));

    windowIds.forEach((windowId, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      updatePosition(windowId, {
        x: GRID_PADDING + col * cellWidth + GRID_CELL_INSET,
        y: headerOffset + row * cellHeight + GRID_CELL_INSET,
      });
    });

    // Then minimize them after a brief pause
    const pillWidth = isMobile ? PILL_WIDTH_MOBILE : PILL_WIDTH_DESKTOP;
    const pillGap = isMobile ? PILL_GAP_MOBILE : PILL_GAP_DESKTOP;
    const maxRowWidth = screenWidth * MAX_ROW_WIDTH_RATIO;
    const perRow = Math.max(1, Math.floor((maxRowWidth + pillGap) / (pillWidth + pillGap)));
    const menuY = isMobile ? HEADER_OFFSET_MOBILE : HEADER_OFFSET_DESKTOP;
    const rowHeight = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP;

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
            showToast(i18n.t('toast.exploreWindows'), TOAST_DURATION);
            hasAnimated.current = true;
          }
        }, POSITION_TO_MINIMIZE_DELAY);
        timerIdsRef.current.push(innerTimerId);
      }, MINIMIZE_DELAY_BASE + index * MINIMIZE_STAGGER_PER_WINDOW);
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
      const isMobile = screenWidth <= MOBILE_BREAKPOINT;
      const pillWidth = isMobile ? PILL_WIDTH_MOBILE : PILL_WIDTH_DESKTOP;
      const pillGap = isMobile ? PILL_GAP_MOBILE : PILL_GAP_DESKTOP;
      const maxRowWidth = screenWidth * MAX_ROW_WIDTH_RATIO;
      const perRow = Math.max(1, Math.floor((maxRowWidth + pillGap) / (pillWidth + pillGap)));
      const menuY = isMobile ? HEADER_OFFSET_MOBILE : HEADER_OFFSET_DESKTOP;
      const rowHeight = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP;

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
      resizeTimeout = setTimeout(handleResize, RESIZE_DEBOUNCE_DELAY);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [windows, windowIds, updatePosition]);
};

export default useWindowLayout;