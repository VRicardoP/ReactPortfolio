import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useVisitorTracking from '../useVisitorTracking'

describe('useVisitorTracking', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    sessionStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('sends a POST request on mount', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true })

    renderHook(() => useVisitorTracking())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/api/v1/analytics/track')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(options.body)
    expect(body).toHaveProperty('page_url')
    expect(body).toHaveProperty('referrer')
    expect(body).toHaveProperty('user_agent')
  })

  it('does not send duplicate requests (sessionStorage dedup)', async () => {
    // Simulate that a visit was already tracked this session
    sessionStorage.setItem('visit_tracked', 'true')

    renderHook(() => useVisitorTracking())

    // Give the effect time to run
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  it('handles fetch errors silently', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    // Should not throw
    renderHook(() => useVisitorTracking())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    // The hook logs a warning but doesn't break
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to track visit:',
      'Network error'
    )
  })

  it('sends correct payload (page_url, referrer)', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true })

    renderHook(() => useVisitorTracking())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.page_url).toBe(window.location.href)
    expect(body.referrer).toBe(document.referrer || null)
    expect(body.user_agent).toBe(navigator.userAgent)
  })

  it('sets visit_tracked in sessionStorage after successful request', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true })

    renderHook(() => useVisitorTracking())

    await waitFor(() => {
      expect(sessionStorage.getItem('visit_tracked')).toBe('true')
    })
  })

  it('does not set visit_tracked if response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false })

    renderHook(() => useVisitorTracking())

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    expect(sessionStorage.getItem('visit_tracked')).toBeNull()
  })
})
