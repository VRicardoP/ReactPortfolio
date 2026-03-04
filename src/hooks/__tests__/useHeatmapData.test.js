import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHeatmapData } from '../useHeatmapData'

const mockAuthenticatedFetch = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
  }),
}))

describe('useHeatmapData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches heatmap and engagement data on mount', async () => {
    const mockHeatmap = [{ x: 0.5, y: 0.3, count: 5 }]
    const mockEngagement = {
      total_sessions: 10,
      avg_session_duration_ms: 30000,
      window_focus_times: [],
      clicks_by_area: [],
      sessions_timeline: [],
      total_clicks: 25,
      total_focus_events: 15,
    }

    mockAuthenticatedFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockHeatmap) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockEngagement) })

    const { result } = renderHook(() => useHeatmapData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.heatmapData).toEqual(mockHeatmap)
    expect(result.current.engagementStats).toEqual(mockEngagement)
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(2)
  })

  it('handles fetch errors gracefully', async () => {
    mockAuthenticatedFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useHeatmapData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.heatmapData).toBeNull()
    expect(result.current.engagementStats).toBeNull()
  })

  it('handles non-ok responses', async () => {
    mockAuthenticatedFetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })

    const { result } = renderHook(() => useHeatmapData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.heatmapData).toBeNull()
    expect(result.current.engagementStats).toBeNull()
  })

  it('starts in loading state', () => {
    mockAuthenticatedFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(null) })
    const { result } = renderHook(() => useHeatmapData())
    expect(result.current.loading).toBe(true)
  })
})
