import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import usePortfolioData from '../usePortfolioData'

// The hook tries the API first, then falls back to static files.

describe('usePortfolioData', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('starts in loading state', () => {
    global.fetch.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePortfolioData())
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns data from API when available', async () => {
    const mockData = { name: 'Vicente', skills: ['React'] }
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('falls back to static file when API fails', async () => {
    const mockData = { name: 'Vicente', skills: ['React'] }
    // API call fails
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // Static file succeeds
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('returns error when both API and static file fail', async () => {
    // API call fails
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // Static file also fails
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 })

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Failed to load portfolio data')
  })

  it('returns error on complete network failure', async () => {
    // API call throws
    global.fetch.mockRejectedValueOnce(new Error('API unreachable'))
    // Static file also throws
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Network error')
  })
})
