import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useInteractionTracking from '../useInteractionTracking'

describe('useInteractionTracking', () => {
  let sendBeaconSpy

  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    sendBeaconSpy = vi.fn(() => true)
    navigator.sendBeacon = sendBeaconSpy
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
    // Mock crypto.randomUUID
    if (!global.crypto) global.crypto = {}
    global.crypto.randomUUID = vi.fn(() => 'mock-uuid-1234')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('generates session ID on mount', () => {
    renderHook(() => useInteractionTracking())
    expect(sessionStorage.getItem('interaction_session_id')).toBe('mock-uuid-1234')
  })

  it('reuses existing session ID', () => {
    sessionStorage.setItem('interaction_session_id', 'existing-session')
    renderHook(() => useInteractionTracking())
    expect(sessionStorage.getItem('interaction_session_id')).toBe('existing-session')
  })

  it('sets session start time on mount', () => {
    renderHook(() => useInteractionTracking())
    expect(sessionStorage.getItem('interaction_session_start')).toBeTruthy()
  })

  it('captures click events and flushes on interval via fetch', () => {
    renderHook(() => useInteractionTracking())

    // Simulate a click
    act(() => {
      document.dispatchEvent(new MouseEvent('click', {
        clientX: 500,
        clientY: 300,
        bubbles: true,
      }))
    })

    // Advance timer to trigger flush (10s) — interval uses fetch
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/analytics/interactions')
    expect(options.method).toBe('POST')
    expect(options.keepalive).toBe(true)
    expect(sendBeaconSpy).not.toHaveBeenCalled()
  })

  it('does not flush when buffer is empty', () => {
    renderHook(() => useInteractionTracking())

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(sendBeaconSpy).not.toHaveBeenCalled()
  })

  it('captures window focus events from custom events', () => {
    renderHook(() => useInteractionTracking())

    // Simulate window focus
    act(() => {
      window.dispatchEvent(new CustomEvent('window-focused', {
        detail: { windowId: 'profile-window' }
      }))
    })

    // Simulate window blur after 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    act(() => {
      window.dispatchEvent(new CustomEvent('window-blurred', {
        detail: { windowId: 'profile-window' }
      }))
    })

    // Flush via interval (uses fetch)
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('flushes all pending data on beforeunload via sendBeacon', () => {
    renderHook(() => useInteractionTracking())

    // Add a click
    act(() => {
      document.dispatchEvent(new MouseEvent('click', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      }))
    })

    // Trigger unload — uses sendBeacon
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1)
    const [url, blob] = sendBeaconSpy.mock.calls[0]
    expect(url).toContain('/api/v1/analytics/interactions')
    expect(blob).toBeInstanceOf(Blob)
  })

  it('includes session_end event on beforeunload', () => {
    renderHook(() => useInteractionTracking())

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    // session_end should be sent even without clicks
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1)
  })

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderHook(() => useInteractionTracking())
    unmount()

    // After unmount, clicks should not be tracked
    act(() => {
      document.dispatchEvent(new MouseEvent('click', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      }))
    })

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(sendBeaconSpy).not.toHaveBeenCalled()
  })

  it('falls back to fetch when sendBeacon is not available on unload', () => {
    delete navigator.sendBeacon

    renderHook(() => useInteractionTracking())

    act(() => {
      document.dispatchEvent(new MouseEvent('click', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      }))
    })

    // beforeunload without sendBeacon falls back to fetch
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/analytics/interactions')
    expect(options.method).toBe('POST')
    expect(options.keepalive).toBe(true)
  })
})
