import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useUnifiedSearch from '../useUnifiedSearch'

// Mock authenticatedFetch from AuthContext
const mockAuthenticatedFetch = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
  }),
}))

// Mock showToast
const mockShowToast = vi.fn()
vi.mock('../../components/UI/Toast', () => ({
  showToast: (...args) => mockShowToast(...args),
}))

// Mock i18next
const mockT = (key) => key
const mockI18n = { language: 'en', changeLanguage: vi.fn() }
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
}))

const makeMockResponse = (data) => ({
  ok: true,
  json: () => Promise.resolve(data),
})

describe('useUnifiedSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // --- 1. Initial state ---
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useUnifiedSearch())

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.page).toBe(0)
    expect(result.current.filters).toEqual({
      source: '',
      remote: false,
      country: '',
    })
    expect(result.current.totalPages).toBe(1)
    expect(result.current.pagedResults).toEqual([])
    expect(typeof result.current.setQuery).toBe('function')
    expect(typeof result.current.setPage).toBe('function')
    expect(typeof result.current.handleFilterChange).toBe('function')
  })

  // --- 2. Debounced search triggers on query change ---
  it('triggers debounced search when query changes', async () => {
    const mockJobs = [
      { id: 1, title: 'React Dev' },
      { id: 2, title: 'Node Dev' },
    ]
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse(mockJobs))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('react')
    })

    // Wait for debounce + fetch to complete
    await waitFor(() => {
      expect(result.current.results).toEqual(mockJobs)
    })

    expect(result.current.loading).toBe(false)
    const fetchCalls = mockAuthenticatedFetch.mock.calls
    const lastUrl = fetchCalls[fetchCalls.length - 1][0]
    expect(lastUrl).toContain('q=react')
  })

  // --- 3. Search does not fire without query and source ---
  it('does not search when query and source are both empty', async () => {
    const { result } = renderHook(() => useUnifiedSearch())

    // Wait a bit to ensure no fetch is made
    await new Promise(r => setTimeout(r, 400))

    expect(mockAuthenticatedFetch).not.toHaveBeenCalled()
    expect(result.current.results).toEqual([])
  })

  // --- 4. Filter change triggers search ---
  it('triggers search when source filter changes', async () => {
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse([{ id: 1 }]))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.handleFilterChange('source', 'remotive')
    })

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalled()
    })

    const fetchCalls = mockAuthenticatedFetch.mock.calls
    const lastUrl = fetchCalls[fetchCalls.length - 1][0]
    expect(lastUrl).toContain('source=remotive')
  })

  // --- 5. Multiple filter params ---
  it('includes all active filters in search URL', async () => {
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse([]))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('python')
      result.current.handleFilterChange('source', 'jobicy')
      result.current.handleFilterChange('remote', true)
      result.current.handleFilterChange('country', 'CH')
    })

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalled()
    })

    // Find the call that contains all params
    const lastCallIdx = mockAuthenticatedFetch.mock.calls.length - 1
    const url = mockAuthenticatedFetch.mock.calls[lastCallIdx][0]
    expect(url).toContain('q=python')
    expect(url).toContain('source=jobicy')
    expect(url).toContain('remote_only=true')
    expect(url).toContain('country=CH')
  })

  // --- 6. Search error shows toast ---
  it('shows toast and clears results on search error', async () => {
    mockAuthenticatedFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('java')
    })

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('dashboard.unified.errorSearch')
    })

    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  // --- 7. Handles different response shapes ---
  it('handles array response directly', async () => {
    const jobs = [{ id: 1 }, { id: 2 }]
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse(jobs))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('test')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual(jobs)
    })
  })

  it('handles response with results field', async () => {
    const jobs = [{ id: 1 }]
    mockAuthenticatedFetch.mockResolvedValue(
      makeMockResponse({ results: jobs })
    )

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('test')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual(jobs)
    })
  })

  it('handles response with data field', async () => {
    const jobs = [{ id: 1 }]
    mockAuthenticatedFetch.mockResolvedValue(
      makeMockResponse({ data: jobs })
    )

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('test')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual(jobs)
    })
  })

  // --- 8. Pagination ---
  it('paginates results correctly', async () => {
    // Create 25 results (more than one page of 20)
    const jobs = Array.from({ length: 25 }, (_, i) => ({ id: i, title: `Job ${i}` }))
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse(jobs))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('test')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(25)
    })

    // Page 0: first 20 items
    expect(result.current.pagedResults).toHaveLength(20)
    expect(result.current.totalPages).toBe(2)
    expect(result.current.page).toBe(0)

    // Navigate to page 1
    act(() => {
      result.current.setPage(1)
    })

    expect(result.current.pagedResults).toHaveLength(5)
    expect(result.current.page).toBe(1)
  })

  // --- 9. Search resets page to 0 ---
  it('resets page to 0 on new search', async () => {
    const jobs = Array.from({ length: 25 }, (_, i) => ({ id: i }))
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse(jobs))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('first')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(25)
    })

    // Go to page 1
    act(() => {
      result.current.setPage(1)
    })
    expect(result.current.page).toBe(1)

    // New search resets to page 0
    act(() => {
      result.current.setQuery('second')
    })

    await waitFor(() => {
      expect(result.current.page).toBe(0)
    })
  })

  // --- 10. handleFilterChange updates filters ---
  it('updates individual filter fields', () => {
    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.handleFilterChange('source', 'adzuna')
    })
    expect(result.current.filters.source).toBe('adzuna')

    act(() => {
      result.current.handleFilterChange('remote', true)
    })
    expect(result.current.filters.remote).toBe(true)

    act(() => {
      result.current.handleFilterChange('country', 'DE')
    })
    expect(result.current.filters.country).toBe('DE')
  })

  // --- 11. totalPages minimum is 1 ---
  it('totalPages is at least 1 even with empty results', () => {
    const { result } = renderHook(() => useUnifiedSearch())

    expect(result.current.totalPages).toBe(1)
    expect(result.current.pagedResults).toEqual([])
  })

  // --- 12. Source-only search (no query) works ---
  it('searches with source filter only (no query)', async () => {
    mockAuthenticatedFetch.mockResolvedValue(
      makeMockResponse([{ id: 1, title: 'From Remotive' }])
    )

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.handleFilterChange('source', 'remotive')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })

    const lastCallIdx = mockAuthenticatedFetch.mock.calls.length - 1
    const url = mockAuthenticatedFetch.mock.calls[lastCallIdx][0]
    expect(url).toContain('source=remotive')
    expect(url).not.toContain('q=')
  })

  // --- 13. Empty query with source clears results when source removed ---
  it('clears results when both query and source become empty', async () => {
    mockAuthenticatedFetch.mockResolvedValue(
      makeMockResponse([{ id: 1, title: 'Job' }])
    )

    const { result } = renderHook(() => useUnifiedSearch())

    // Set source to trigger search
    act(() => {
      result.current.handleFilterChange('source', 'remotive')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })

    // Remove source — should clear results
    act(() => {
      result.current.handleFilterChange('source', '')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual([])
    })
  })

  // --- 14. setPage updates page ---
  it('allows manual page navigation', async () => {
    const jobs = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse(jobs))

    const { result } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('jobs')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(50)
    })

    expect(result.current.totalPages).toBe(3) // ceil(50/20) = 3

    act(() => {
      result.current.setPage(2)
    })

    expect(result.current.page).toBe(2)
    expect(result.current.pagedResults).toHaveLength(10) // last page: 50 - 40 = 10
  })

  // --- 15. Cleanup on unmount ---
  it('cleans up debounce timer on unmount', () => {
    const { result, unmount } = renderHook(() => useUnifiedSearch())

    act(() => {
      result.current.setQuery('test')
    })

    // Unmount should not throw
    unmount()
  })
})
