import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../config/api', () => ({
  BACKEND_URL: 'http://test',
  DEFAULT_HEADERS: { 'ngrok-skip-browser-warning': 'true' },
}))
vi.mock('../../components/UI/Toast', () => ({ showToast: vi.fn() }))

import { useSSEEvents } from '../useSSEEvents'
import { useAuth } from '../../context/AuthContext'
import { showToast } from '../../components/UI/Toast'

const pendingResponse = () => ({
  ok: true,
  body: { getReader: () => ({ read: () => new Promise(() => {}) }) },
})

const eventResponse = (message) => ({
  ok: true,
  body: new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`))
      controller.close()
    },
  }),
})

describe('useSSEEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuth.mockReturnValue({ authenticatedFetch: vi.fn(), isAuthenticated: false })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not connect when not authenticated', () => {
    const authenticatedFetch = vi.fn()
    useAuth.mockReturnValue({ authenticatedFetch, isAuthenticated: false })

    renderHook(() => useSSEEvents())

    expect(authenticatedFetch).not.toHaveBeenCalled()
  })

  it('aborts the active connection on unmount', () => {
    const authenticatedFetch = vi.fn().mockReturnValue(new Promise(() => {}))
    useAuth.mockReturnValue({ authenticatedFetch, isAuthenticated: true })
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    const { unmount } = renderHook(() => useSSEEvents())
    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
  })

  it('shows a toast for new jobs', async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(eventResponse({
      type: 'new_jobs',
      data: { source: 'remotive', count: 5 },
      timestamp: '2024-01-01T00:00:00Z',
    }))
    useAuth.mockReturnValue({ authenticatedFetch, isAuthenticated: true })

    const { unmount } = renderHook(() => useSSEEvents())
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), 4000))
    unmount()
  })

  it('marks dashboard data stale for visitor events', async () => {
    const authenticatedFetch = vi.fn().mockResolvedValue(eventResponse({
      type: 'new_visitor',
      data: {},
      timestamp: '2024-01-01T00:00:00Z',
    }))
    useAuth.mockReturnValue({ authenticatedFetch, isAuthenticated: true })
    const listener = vi.fn()
    window.addEventListener('dashboard-data-stale', listener)

    const { unmount } = renderHook(() => useSSEEvents())
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1))
    expect(listener.mock.calls[0][0].detail).toEqual({ scope: 'new_visitor' })
    unmount()
    window.removeEventListener('dashboard-data-stale', listener)
  })

  it('aborts and reconnects after eighty seconds without events', async () => {
    vi.useFakeTimers()
    const authenticatedFetch = vi.fn().mockResolvedValue(pendingResponse())
    useAuth.mockReturnValue({ authenticatedFetch, isAuthenticated: true })
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    const { unmount } = renderHook(() => useSSEEvents())
    await act(async () => {})
    expect(authenticatedFetch).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(80_000) })

    expect(abortSpy).toHaveBeenCalled()
    expect(authenticatedFetch).toHaveBeenCalledTimes(2)
    unmount()
  })
})
