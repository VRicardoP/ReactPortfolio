import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useIsMobile from '../useIsMobile';
import { COMPACT_LAYOUT_QUERY } from '../../config/layout';

describe('useIsMobile', () => {
    let changeHandler;

    beforeEach(() => {
        changeHandler = null;
        document.documentElement.removeAttribute('data-layout');
        window.matchMedia = vi.fn((query) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn((_, handler) => { changeHandler = handler; }),
            removeEventListener: vi.fn(),
        }));
    });

    // DT-208: el criterio es uno solo y vive en config/layout.js. Que un móvil
    // en horizontal (850-930 px) o una tablet caigan en el escritorio era el
    // fallo de origen; esta guarda impide volver al umbral por ancho a secas.
    it('evaluates the single compact-layout query from config/layout.js', () => {
        renderHook(() => useIsMobile());
        expect(window.matchMedia).toHaveBeenCalledWith(COMPACT_LAYOUT_QUERY);
        expect(COMPACT_LAYOUT_QUERY).toContain('(max-width: 768px)');
        expect(COMPACT_LAYOUT_QUERY).toContain('(max-width: 1024px) and (hover: none) and (pointer: coarse)');
    });

    it('returns false when the query does not match (desktop)', () => {
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it('returns true when the query matches (compact)', () => {
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

    // El CSS (scroll del body, escala tipográfica) decide por este atributo,
    // no por una media query propia: así no puede desincronizarse del hook.
    it('mirrors the mode into <html data-layout> and keeps it in sync', () => {
        renderHook(() => useIsMobile());
        expect(document.documentElement.getAttribute('data-layout')).toBe('desktop');

        act(() => {
            changeHandler({ matches: true });
        });
        expect(document.documentElement.getAttribute('data-layout')).toBe('compact');
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
