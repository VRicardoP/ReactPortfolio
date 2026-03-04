import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useJobFilter from '../useJobFilter'

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

describe('useJobFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // --- 1. Initial state ---
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useJobFilter())

    expect(result.current.filters).toEqual({
      country: '',
      city: '',
      salaryMin: '',
      salaryMax: '',
      q: '',
      remoteOnly: false,
    })
    expect(result.current.results).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.searched).toBe(false)
    expect(result.current.page).toBe(0)
    expect(result.current.totalPages).toBe(0)
    expect(result.current.hasFilters).toBeFalsy()
  })

  // --- 2. handleFilterChange updates filters ---
  it('updates filters via handleFilterChange', () => {
    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'react')
    })
    expect(result.current.filters.q).toBe('react')

    act(() => {
      result.current.handleFilterChange('country', 'CH')
    })
    expect(result.current.filters.country).toBe('CH')

    act(() => {
      result.current.handleFilterChange('city', 'Zurich')
    })
    expect(result.current.filters.city).toBe('Zurich')

    act(() => {
      result.current.handleFilterChange('salaryMin', '50000')
    })
    expect(result.current.filters.salaryMin).toBe('50000')

    act(() => {
      result.current.handleFilterChange('salaryMax', '100000')
    })
    expect(result.current.filters.salaryMax).toBe('100000')

    act(() => {
      result.current.handleFilterChange('remoteOnly', true)
    })
    expect(result.current.filters.remoteOnly).toBe(true)
  })

  // --- 3. handleSearch success ---
  it('performs search and sets results', async () => {
    const mockData = {
      data: [
        { id: 1, title: 'React Dev' },
        { id: 2, title: 'Node Dev' },
      ],
      metadata: { total: 42 },
    }
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockData))

    const { result } = renderHook(() => useJobFilter())

    // Set a filter first
    act(() => {
      result.current.handleFilterChange('q', 'react')
      result.current.handleFilterChange('country', 'CH')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.results).toEqual(mockData.data)
    expect(result.current.total).toBe(42)
    expect(result.current.loading).toBe(false)
    expect(result.current.searched).toBe(true)
    expect(result.current.page).toBe(0)

    // Verify URL params
    const url = mockAuthenticatedFetch.mock.calls[0][0]
    expect(url).toContain('q=react')
    expect(url).toContain('country=CH')
    expect(url).toContain('limit=20')
    expect(url).toContain('offset=0')
  })

  // --- 4. handleSearch with pagination ---
  it('supports pagination via handleSearch(page)', async () => {
    const mockData = {
      data: [{ id: 3, title: 'Page 2 job' }],
      metadata: { total: 42 },
    }
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockData))

    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'python')
    })

    await act(async () => {
      await result.current.handleSearch(2) // page 2
    })

    expect(result.current.page).toBe(2)
    const url = mockAuthenticatedFetch.mock.calls[0][0]
    expect(url).toContain('offset=40') // page 2 * 20
  })

  // --- 5. handleSearch error ---
  it('shows toast and resets results on search error', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Search failed'))

    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'java')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.results).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.loading).toBe(false)
    expect(result.current.searched).toBe(true)
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.jobFilter.errorSearch')
  })

  // --- 6. handleClear resets everything ---
  it('clears filters, results, and search state', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({
      data: [{ id: 1, title: 'Job' }],
      metadata: { total: 1 },
    }))

    const { result } = renderHook(() => useJobFilter())

    // Set filters and search
    act(() => {
      result.current.handleFilterChange('q', 'react')
      result.current.handleFilterChange('country', 'US')
    })
    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.searched).toBe(true)
    expect(result.current.results.length).toBe(1)

    // Clear
    act(() => {
      result.current.handleClear()
    })

    expect(result.current.filters).toEqual({
      country: '',
      city: '',
      salaryMin: '',
      salaryMax: '',
      q: '',
      remoteOnly: false,
    })
    expect(result.current.results).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.searched).toBe(false)
    expect(result.current.page).toBe(0)
  })

  // --- 7. handleSave calls onSaveSearch callback ---
  it('calls onSaveSearch with current filters', () => {
    const mockOnSave = vi.fn()
    const { result } = renderHook(() => useJobFilter(mockOnSave))

    act(() => {
      result.current.handleFilterChange('q', 'typescript')
      result.current.handleFilterChange('country', 'DE')
      result.current.handleFilterChange('remoteOnly', true)
    })

    act(() => {
      result.current.handleSave()
    })

    expect(mockOnSave).toHaveBeenCalledWith({
      q: 'typescript',
      country: 'DE',
      city: '',
      salaryMin: '',
      salaryMax: '',
      remoteOnly: true,
    })
  })

  // --- 8. handleSave does nothing without callback ---
  it('does nothing when onSaveSearch is not provided', () => {
    const { result } = renderHook(() => useJobFilter())

    // Should not throw
    act(() => {
      result.current.handleSave()
    })
  })

  // --- 9. hasFilters computed correctly ---
  it('hasFilters is truthy when any filter is set', () => {
    const { result } = renderHook(() => useJobFilter())

    expect(result.current.hasFilters).toBeFalsy()

    act(() => {
      result.current.handleFilterChange('q', 'go')
    })
    expect(result.current.hasFilters).toBeTruthy()
  })

  it('hasFilters is truthy for remoteOnly', () => {
    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('remoteOnly', true)
    })
    expect(result.current.hasFilters).toBeTruthy()
  })

  // --- 10. totalPages computed correctly ---
  it('computes totalPages based on total and page size', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({
      data: Array.from({ length: 20 }, (_, i) => ({ id: i })),
      metadata: { total: 45 },
    }))

    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'test')
    })
    await act(async () => {
      await result.current.handleSearch()
    })

    // 45 / 20 = 2.25 -> ceil = 3
    expect(result.current.totalPages).toBe(3)
  })

  // --- 11. buildQueryParams includes all active filters ---
  it('buildQueryParams builds correct query string with all filters', () => {
    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'react')
      result.current.handleFilterChange('country', 'CH')
      result.current.handleFilterChange('city', 'Zurich')
      result.current.handleFilterChange('salaryMin', '50000')
      result.current.handleFilterChange('salaryMax', '100000')
      result.current.handleFilterChange('remoteOnly', true)
    })

    const qs = result.current.buildQueryParams(0)
    expect(qs).toContain('q=react')
    expect(qs).toContain('country=CH')
    expect(qs).toContain('city=Zurich')
    expect(qs).toContain('salary_min=50000')
    expect(qs).toContain('salary_max=100000')
    expect(qs).toContain('remote_only=true')
    expect(qs).toContain('limit=20')
    expect(qs).toContain('offset=0')
  })

  // --- 12. buildQueryParams omits empty filters ---
  it('buildQueryParams omits empty filter values', () => {
    const { result } = renderHook(() => useJobFilter())

    const qs = result.current.buildQueryParams(0)
    expect(qs).not.toContain('q=')
    expect(qs).not.toContain('country=')
    expect(qs).not.toContain('city=')
    expect(qs).not.toContain('salary_min=')
    expect(qs).not.toContain('salary_max=')
    expect(qs).not.toContain('remote_only=')
    expect(qs).toContain('limit=20')
    expect(qs).toContain('offset=0')
  })

  // --- 13. formatSalary formats correctly ---
  it('formats salary with min and max', () => {
    const { result } = renderHook(() => useJobFilter())

    expect(result.current.formatSalary(50000, 100000, 'CHF')).toBe(
      'CHF 50,000 - 100,000'
    )
  })

  it('formats salary with min only', () => {
    const { result } = renderHook(() => useJobFilter())

    expect(result.current.formatSalary(50000, null, 'EUR')).toBe('EUR 50,000+')
  })

  it('formats salary with max only', () => {
    const { result } = renderHook(() => useJobFilter())

    const formatted = result.current.formatSalary(null, 80000, 'USD')
    expect(formatted).toContain('80,000')
  })

  it('formats salary with default currency USD', () => {
    const { result } = renderHook(() => useJobFilter())

    expect(result.current.formatSalary(60000, 90000)).toBe(
      'USD 60,000 - 90,000'
    )
  })

  it('returns empty string when no salary', () => {
    const { result } = renderHook(() => useJobFilter())

    expect(result.current.formatSalary(null, null)).toBe('')
  })
})
