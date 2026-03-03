import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDashboardData } from '../useDashboardData'

// Mock the useAuth hook to provide authenticatedFetch
const mockAuthenticatedFetch = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
  }),
}))

// Mock jobSources to avoid loading all 12 sources in tests
vi.mock('../../config/jobSources', () => ({
  JOB_SOURCES: [
    { key: 'testjobs', urlPath: '/api/v1/test-jobs/recent' },
  ],
  extractJobs: (data) => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (Array.isArray(data.data)) return data.data
    if (Array.isArray(data.jobs)) return data.jobs
    return []
  },
  normalizeJob: (job, source) => ({
    id: `${source}-${job.id}`,
    title: job.title || '',
    company: job.company || '',
    location: job.location || '',
    date: job.date || '',
    url: job.url || '',
    tags: job.tags || [],
    remote: false,
    source,
    employmentType: '',
  }),
}))

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const makeMockResponse = (data) => ({
    ok: true,
    json: () => Promise.resolve(data),
  })

  it('returns loading true initially', () => {
    // Make fetch hang to capture the loading state
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useDashboardData())
    expect(result.current.loading).toBe(true)
  })

  it('loads stats, mapData, chatAnalytics on mount', async () => {
    const mockStats = { total_visitors: 42, unique_visitors: 30 }
    const mockMapData = [{ lat: 47.3, lon: 8.5, city: 'Zurich' }]
    const mockChatAnalytics = { general: { total_chats: 10 }, top_questions: [], timeline_daily: [], by_country: [] }
    const mockJobData = [{ id: 1, title: 'Dev' }]

    mockAuthenticatedFetch
      // Call 1: stats
      .mockResolvedValueOnce(makeMockResponse(mockStats))
      // Call 2: map-data
      .mockResolvedValueOnce(makeMockResponse(mockMapData))
      // Call 3: chat analytics
      .mockResolvedValueOnce(makeMockResponse(mockChatAnalytics))
      // Call 4: job source (testjobs)
      .mockResolvedValueOnce(makeMockResponse(mockJobData))

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.stats).toEqual(mockStats)
    expect(result.current.mapData).toEqual(mockMapData)
    expect(result.current.chatAnalytics).toEqual(mockChatAnalytics)
    expect(result.current.error).toBeNull()
  })

  it('sets loading false after data loads', async () => {
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse({}))
      .mockResolvedValueOnce(makeMockResponse([]))
      .mockResolvedValueOnce(makeMockResponse({ general: null, top_questions: [], timeline_daily: [], by_country: [] }))
      .mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useDashboardData())

    // Initially loading
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('handles fetch errors gracefully', async () => {
    // Critical fetches catch errors individually, so they don't throw
    mockAuthenticatedFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Individual catch blocks handle these, stats/map will be null
    expect(result.current.stats).toBeNull()
    expect(result.current.mapData).toEqual([])
  })

  it('includes jobData in the result', async () => {
    const mockJobData = [{ id: 1, title: 'React Developer' }]

    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse({ total: 5 }))
      .mockResolvedValueOnce(makeMockResponse([]))
      .mockResolvedValueOnce(makeMockResponse({ general: null, top_questions: [], timeline_daily: [], by_country: [] }))
      // Job source fetch
      .mockResolvedValueOnce(makeMockResponse(mockJobData))

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // jobData loads progressively in the background, normalized at fetch time
    await waitFor(() => {
      expect(result.current.jobData).toHaveProperty('testjobs')
    })

    // Raw data is spread into the stored object alongside _normalized
    expect(result.current.jobData.testjobs._normalized).toEqual([
      {
        id: 'testjobs-1',
        title: 'React Developer',
        company: '',
        location: '',
        date: '',
        url: '',
        tags: [],
        remote: false,
        source: 'testjobs',
        employmentType: '',
      },
    ])
  })
})
