import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useInactivityLogout from '../useInactivityLogout';

describe('useInactivityLogout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
    sessionStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it('logs out after fifteen minutes without activity', () => {
    const logout = vi.fn();
    renderHook(() => useInactivityLogout(true, logout));

    act(() => vi.advanceTimersByTime(14 * 60 * 1000));
    expect(logout).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(60 * 1000));
    expect(logout).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('logoutReason')).toBe('inactivity');
  });

  it('records activity without replacing the interval', () => {
    const logout = vi.fn();
    renderHook(() => useInactivityLogout(true, logout));

    act(() => {
      vi.advanceTimersByTime(14 * 60 * 1000);
      window.dispatchEvent(new MouseEvent('mousemove'));
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(logout).not.toHaveBeenCalled();
  });
});
