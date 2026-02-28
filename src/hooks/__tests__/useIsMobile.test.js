import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useIsMobile from '../useIsMobile';

describe('useIsMobile', () => {
    let changeHandler;

    beforeEach(() => {
        changeHandler = null;
        window.matchMedia = vi.fn((query) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn((_, handler) => { changeHandler = handler; }),
            removeEventListener: vi.fn(),
        }));
    });

    it('returns false when screen is wider than 768px', () => {
        window.matchMedia = vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it('returns true when screen is 768px or narrower', () => {
        window.matchMedia = vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn((_, handler) => { changeHandler = handler; }),
            removeEventListener: vi.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    it('updates when matchMedia change event fires', () => {
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);

        act(() => {
            changeHandler({ matches: true });
        });
        expect(result.current).toBe(true);

        act(() => {
            changeHandler({ matches: false });
        });
        expect(result.current).toBe(false);
    });

    it('cleans up event listener on unmount', () => {
        const removeListener = vi.fn();
        window.matchMedia = vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: removeListener,
        }));

        const { unmount } = renderHook(() => useIsMobile());
        unmount();
        expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
});
