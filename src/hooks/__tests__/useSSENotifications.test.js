import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing the hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../config/api', () => ({
  BACKEND_URL: 'http://test',
}))

vi.mock('../../components/UI/Toast', () => ({
  showToast: vi.fn(),
}))

import { useSSENotifications } from '../useSSENotifications'
import { useAuth } from '../../context/AuthContext'
import { showToast } from '../../components/UI/Toast'

describe('useSSENotifications', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
    vi.clearAllMocks()
    // Default: not authenticated
    useAuth.mockReturnValue({ token: null, isAuthenticated: false })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('does not connect when not authenticated', () => {
    global.fetch = vi.fn()

    renderHook(() => useSSENotifications())

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('returns empty notifications initially', () => {
    const { result } = renderHook(() => useSSENotifications())

    expect(result.current.notifications).toEqual([])
    expect(typeof result.current.dismissNotification).toBe('function')
    expect(typeof result.current.clearAll).toBe('function')
  })

  it('dismissNotification removes a notification by id', async () => {
    // Set up authenticated state with a stream that sends one event
    useAuth.mockReturnValue({ token: 'test-token', isAuthenticated: true })

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"new_jobs","source":"remotive","count":5}\n\n'
          )
        )
        // Don't close immediately — let the hook process the data
        setTimeout(() => controller.close(), 50)
      },
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const { result } = renderHook(() => useSSENotifications())

    // Wait for the notification to appear
    await waitFor(() => {
      expect(result.current.notifications.length).toBe(1)
    })

    const notificationId = result.current.notifications[0].id

    act(() => {
      result.current.dismissNotification(notificationId)
    })

    expect(result.current.notifications).toHaveLength(0)
  })

  it('clearAll clears all notifications', async () => {
    useAuth.mockReturnValue({ token: 'test-token', isAuthenticated: true })

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"new_jobs","source":"jobicy","count":3}\n\ndata: {"type":"new_jobs","source":"remotive","count":7}\n\n'
          )
        )
        setTimeout(() => controller.close(), 50)
      },
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const { result } = renderHook(() => useSSENotifications())

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(2)
    })

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.notifications).toHaveLength(0)
  })

  it('does not fetch when token is null', () => {
    useAuth.mockReturnValue({ token: null, isAuthenticated: true })
    global.fetch = vi.fn()

    renderHook(() => useSSENotifications())

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('cleanup aborts the connection on unmount', () => {
    useAuth.mockReturnValue({ token: 'test-token', isAuthenticated: true })

    // Use a stream that stays open
    const mockStream = new ReadableStream({
      start() {
        // Never close — simulates a long-lived SSE connection
      },
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

    const { unmount } = renderHook(() => useSSENotifications())

    expect(global.fetch).toHaveBeenCalledTimes(1)

    unmount()

    expect(abortSpy).toHaveBeenCalled()
    abortSpy.mockRestore()
  })

  it('shows toast for new_jobs events', async () => {
    useAuth.mockReturnValue({ token: 'test-token', isAuthenticated: true })

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"new_jobs","source":"remotive","count":5}\n\n'
          )
        )
        setTimeout(() => controller.close(), 50)
      },
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    const { result } = renderHook(() => useSSENotifications())

    await waitFor(() => {
      expect(result.current.notifications.length).toBe(1)
    })

    expect(showToast).toHaveBeenCalledTimes(1)
    // The toast receives the i18n translated string and 4000ms duration
    expect(showToast).toHaveBeenCalledWith(expect.any(String), 4000)
  })

  it('fetches with correct URL and authorization header', () => {
    useAuth.mockReturnValue({ token: 'my-jwt-token', isAuthenticated: true })

    const mockStream = new ReadableStream({ start() {} })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockStream,
    })

    renderHook(() => useSSENotifications())

    expect(global.fetch).toHaveBeenCalledWith(
      'http://test/api/v1/notifications/stream',
      expect.objectContaining({
        headers: { Authorization: 'Bearer my-jwt-token' },
        signal: expect.any(AbortSignal),
      })
    )
  })
})
