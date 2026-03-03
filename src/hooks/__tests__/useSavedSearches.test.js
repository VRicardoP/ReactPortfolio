import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useSavedSearches from '../useSavedSearches'

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

// Mock i18next — stable references to avoid useCallback/useEffect infinite loops
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

describe('useSavedSearches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // --- 1. Initial state ---
  it('returns correct initial state', () => {
    // Hang the initial fetch so we can inspect defaults
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    expect(result.current.searches).toEqual([])
    expect(result.current.loading).toBe(true) // fetch in progress on mount
    expect(result.current.showForm).toBe(false)
    expect(result.current.formData).toEqual({
      name: '',
      q: '',
      country: '',
      city: '',
      salaryMin: '',
      salaryMax: '',
      remoteOnly: false,
    })
    expect(result.current.expandedId).toBeNull()
    expect(result.current.searchResults).toEqual([])
    expect(result.current.searchLoading).toBe(false)
    expect(result.current.resultsTotal).toBe(0)
    expect(result.current.hasAnyFilter).toBeFalsy()
  })

  // --- 2. Fetch searches on mount ---
  it('fetches saved searches on mount and sets them', async () => {
    const mockSearches = [
      { id: 1, name: 'React remote', filters: { q: 'react', remote_only: true } },
      { id: 2, name: 'Python Zurich', filters: { q: 'python', city: 'Zurich' } },
    ]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.searches).toEqual(mockSearches)
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    expect(mockAuthenticatedFetch.mock.calls[0][0]).toContain('/api/v1/saved-searches/')
  })

  it('handles non-array response with results field', async () => {
    const mockSearches = [{ id: 1, name: 'Test' }]
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse({ results: mockSearches })
    )

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.searches).toEqual(mockSearches)
  })

  it('handles non-array response with data field', async () => {
    const mockSearches = [{ id: 1, name: 'Test' }]
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse({ data: mockSearches })
    )

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.searches).toEqual(mockSearches)
  })

  // --- 3. Fetch searches error handling ---
  it('shows toast and resets searches on fetch error', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.searches).toEqual([])
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.savedSearches.errorLoad')
  })

  // --- 4. Create a saved search (handleCreate) ---
  it('creates a saved search with explicit name', async () => {
    // Mount fetch
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Fill form with name and filters
    act(() => {
      result.current.handleFormChange('name', 'My Search')
      result.current.handleFormChange('q', 'react')
      result.current.handleFormChange('country', 'CH')
      result.current.setShowForm(true)
    })

    // Mock create POST + re-fetch after create
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse({ id: 1, name: 'My Search' }))
      .mockResolvedValueOnce(makeMockResponse([{ id: 1, name: 'My Search' }]))

    await act(async () => {
      await result.current.handleCreate()
    })

    // Verify POST was called with correct body
    const createCall = mockAuthenticatedFetch.mock.calls[1]
    expect(createCall[0]).toContain('/api/v1/saved-searches/')
    expect(createCall[1].method).toBe('POST')
    const body = JSON.parse(createCall[1].body)
    expect(body.name).toBe('My Search')
    expect(body.filters.q).toBe('react')
    expect(body.filters.country).toBe('CH')

    // Form should be reset and hidden after successful create
    expect(result.current.showForm).toBe(false)
    expect(result.current.formData.name).toBe('')
    expect(result.current.formData.q).toBe('')
  })

  it('shows toast on create error', async () => {
    // Mount fetch
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.handleFormChange('name', 'Failing Search')
    })

    // Mock create POST failure
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Server error'))

    await act(async () => {
      await result.current.handleCreate()
    })

    expect(mockShowToast).toHaveBeenCalledWith('dashboard.savedSearches.errorCreate')
  })

  // --- 5. Create with auto-name ---
  it('uses auto-generated name when no explicit name given', async () => {
    // Mount fetch
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Fill filters but leave name empty
    act(() => {
      result.current.handleFormChange('q', 'python')
      result.current.handleFormChange('country', 'DE')
      result.current.handleFormChange('remoteOnly', true)
    })

    // Check autoName value
    expect(result.current.autoName()).toBe('python | DE | Remote')

    // Mock create POST + re-fetch
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse({ id: 2 }))
      .mockResolvedValueOnce(makeMockResponse([]))

    await act(async () => {
      await result.current.handleCreate()
    })

    const createCall = mockAuthenticatedFetch.mock.calls[1]
    const body = JSON.parse(createCall[1].body)
    expect(body.name).toBe('python | DE | Remote')
  })

  it('auto-name includes salary range', () => {
    // Hang the initial fetch
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('salaryMin', '50000')
      result.current.handleFormChange('salaryMax', '80000')
    })

    expect(result.current.autoName()).toBe('$50000-80000')
  })

  it('auto-name falls back to "Search" when no filters', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    expect(result.current.autoName()).toBe('Search')
  })

  // --- 6. Delete a saved search ---
  it('deletes a saved search after confirmation', async () => {
    const mockSearches = [
      { id: 1, name: 'Search A' },
      { id: 2, name: 'Search B' },
    ]
    // Mount fetch
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.searches).toHaveLength(2)

    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    // Mock DELETE call
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({}))

    await act(async () => {
      await result.current.handleDelete(1)
    })

    // Search with id=1 removed optimistically
    expect(result.current.searches).toHaveLength(1)
    expect(result.current.searches[0].id).toBe(2)

    // Verify DELETE was called
    const deleteCall = mockAuthenticatedFetch.mock.calls[1]
    expect(deleteCall[0]).toContain('/api/v1/saved-searches/1')
    expect(deleteCall[1].method).toBe('DELETE')
  })

  it('does not delete when confirmation is cancelled', async () => {
    const mockSearches = [{ id: 1, name: 'Search A' }]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    vi.spyOn(window, 'confirm').mockReturnValue(false)

    await act(async () => {
      await result.current.handleDelete(1)
    })

    // Search should still be there
    expect(result.current.searches).toHaveLength(1)
    // No DELETE fetch was made (only the initial mount fetch)
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  it('clears expanded results when deleting the expanded search', async () => {
    const mockSearches = [{ id: 1, name: 'Search A', filters: { q: 'react' } }]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Run the search to expand it
    const searchResultsData = {
      data: [{ id: 10, title: 'React Dev' }],
      metadata: { total: 1 },
    }
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(searchResultsData))

    await act(async () => {
      await result.current.handleRun(mockSearches[0])
    })

    expect(result.current.expandedId).toBe(1)
    expect(result.current.searchResults).toHaveLength(1)

    // Now delete the expanded search
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({}))

    await act(async () => {
      await result.current.handleDelete(1)
    })

    expect(result.current.expandedId).toBeNull()
    expect(result.current.searchResults).toEqual([])
  })

  it('shows toast and re-fetches on delete error', async () => {
    const mockSearches = [{ id: 1, name: 'Search A' }]
    // Mount fetch
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    // DELETE fails, then re-fetch succeeds
    mockAuthenticatedFetch
      .mockRejectedValueOnce(new Error('Delete failed'))
      .mockResolvedValueOnce(makeMockResponse(mockSearches))

    await act(async () => {
      await result.current.handleDelete(1)
    })

    expect(mockShowToast).toHaveBeenCalledWith('dashboard.savedSearches.errorDelete')
  })

  // --- 7. Run a saved search (toggle expand/collapse) ---
  it('runs a saved search and sets results', async () => {
    const mockSearches = [
      { id: 1, name: 'React jobs', filters: { q: 'react', country: 'CH', remote_only: true } },
    ]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const searchResultsData = {
      data: [
        { id: 10, title: 'React Developer' },
        { id: 11, title: 'Senior React Eng' },
      ],
      metadata: { total: 42 },
    }
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(searchResultsData))

    await act(async () => {
      await result.current.handleRun(mockSearches[0])
    })

    expect(result.current.expandedId).toBe(1)
    expect(result.current.searchResults).toEqual(searchResultsData.data)
    expect(result.current.resultsTotal).toBe(42)
    expect(result.current.searchLoading).toBe(false)

    // Verify search params were built correctly
    const runCall = mockAuthenticatedFetch.mock.calls[1]
    const url = runCall[0]
    expect(url).toContain('q=react')
    expect(url).toContain('country=CH')
    expect(url).toContain('remote_only=true')
    expect(url).toContain('limit=')
  })

  it('collapses when running the already-expanded search', async () => {
    const mockSearches = [{ id: 1, name: 'Test', filters: { q: 'test' } }]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Expand
    const searchResultsData = { data: [{ id: 10 }], metadata: { total: 1 } }
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(searchResultsData))

    await act(async () => {
      await result.current.handleRun(mockSearches[0])
    })

    expect(result.current.expandedId).toBe(1)

    // Collapse by running same search again
    await act(async () => {
      await result.current.handleRun(mockSearches[0])
    })

    expect(result.current.expandedId).toBeNull()
    expect(result.current.searchResults).toEqual([])
    // No additional fetch should have been made for the collapse
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(2) // mount + first run
  })

  it('shows toast on run error', async () => {
    const mockSearches = [{ id: 1, name: 'Test', filters: { q: 'test' } }]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockSearches))

    const { result } = renderHook(() => useSavedSearches())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Search failed'))

    await act(async () => {
      await result.current.handleRun(mockSearches[0])
    })

    expect(mockShowToast).toHaveBeenCalledWith('dashboard.savedSearches.errorRun')
    expect(result.current.searchResults).toEqual([])
    expect(result.current.resultsTotal).toBe(0)
    expect(result.current.searchLoading).toBe(false)
  })

  // --- 8. Form change (handleFormChange) ---
  it('updates formData via handleFormChange', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('q', 'typescript')
    })
    expect(result.current.formData.q).toBe('typescript')

    act(() => {
      result.current.handleFormChange('country', 'CH')
    })
    expect(result.current.formData.country).toBe('CH')

    act(() => {
      result.current.handleFormChange('city', 'Zurich')
    })
    expect(result.current.formData.city).toBe('Zurich')

    act(() => {
      result.current.handleFormChange('salaryMin', '60000')
    })
    expect(result.current.formData.salaryMin).toBe('60000')

    act(() => {
      result.current.handleFormChange('salaryMax', '120000')
    })
    expect(result.current.formData.salaryMax).toBe('120000')

    act(() => {
      result.current.handleFormChange('remoteOnly', true)
    })
    expect(result.current.formData.remoteOnly).toBe(true)

    act(() => {
      result.current.handleFormChange('name', 'Custom search')
    })
    expect(result.current.formData.name).toBe('Custom search')
  })

  // --- 9. hasAnyFilter computed value ---
  it('hasAnyFilter is falsy when no filters set', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    expect(result.current.hasAnyFilter).toBeFalsy()
  })

  it('hasAnyFilter is truthy when q is set', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('q', 'react')
    })

    expect(result.current.hasAnyFilter).toBeTruthy()
  })

  it('hasAnyFilter is truthy when country is set', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('country', 'DE')
    })

    expect(result.current.hasAnyFilter).toBeTruthy()
  })

  it('hasAnyFilter is truthy when city is set', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('city', 'Berlin')
    })

    expect(result.current.hasAnyFilter).toBeTruthy()
  })

  it('hasAnyFilter is truthy when salaryMin is set', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('salaryMin', '40000')
    })

    expect(result.current.hasAnyFilter).toBeTruthy()
  })

  it('hasAnyFilter is truthy when salaryMax is set', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('salaryMax', '100000')
    })

    expect(result.current.hasAnyFilter).toBeTruthy()
  })

  it('hasAnyFilter is truthy when remoteOnly is set', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useSavedSearches())

    act(() => {
      result.current.handleFormChange('remoteOnly', true)
    })

    expect(result.current.hasAnyFilter).toBeTruthy()
  })
})
