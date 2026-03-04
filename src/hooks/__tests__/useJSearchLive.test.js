import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useJSearchLive from '../useJSearchLive'

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

describe('useJSearchLive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- 1. Initial state ---
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useJSearchLive())

    expect(result.current.formFields).toEqual({
      query: '',
      country: 'us',
      date_posted: 'all',
      employment_type: 'all',
      remote_only: false,
    })
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.cooldown).toBe(false)
    expect(result.current.cooldownTimer).toBe(0)
    expect(typeof result.current.handleFieldChange).toBe('function')
    expect(typeof result.current.handleSearch).toBe('function')
    expect(typeof result.current.formatSalary).toBe('function')
  })

  // --- 2. handleFieldChange updates form fields ---
  it('updates form fields via handleFieldChange', () => {
    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'react developer')
    })
    expect(result.current.formFields.query).toBe('react developer')

    act(() => {
      result.current.handleFieldChange('country', 'ch')
    })
    expect(result.current.formFields.country).toBe('ch')

    act(() => {
      result.current.handleFieldChange('date_posted', 'week')
    })
    expect(result.current.formFields.date_posted).toBe('week')

    act(() => {
      result.current.handleFieldChange('employment_type', 'FULLTIME')
    })
    expect(result.current.formFields.employment_type).toBe('FULLTIME')

    act(() => {
      result.current.handleFieldChange('remote_only', true)
    })
    expect(result.current.formFields.remote_only).toBe(true)
  })

  // --- 3. handleSearch success ---
  it('performs search and sets results', async () => {
    const mockJobs = [
      { id: 1, title: 'React Dev', company: 'ACME' },
      { id: 2, title: 'Node Dev', company: 'Corp' },
    ]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockJobs))

    const { result } = renderHook(() => useJSearchLive())

    // Set query
    act(() => {
      result.current.handleFieldChange('query', 'react')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.results).toEqual(mockJobs)
    expect(result.current.loading).toBe(false)

    // Verify URL params
    const url = mockAuthenticatedFetch.mock.calls[0][0]
    expect(url).toContain('/api/v1/jsearch-jobs/search')
    expect(url).toContain('q=react')
    expect(url).toContain('country=us')
  })

  // --- 4. handleSearch with non-default params ---
  it('includes non-default filter params in search URL', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'python')
      result.current.handleFieldChange('country', 'de')
      result.current.handleFieldChange('date_posted', 'week')
      result.current.handleFieldChange('employment_type', 'FULLTIME')
      result.current.handleFieldChange('remote_only', true)
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    const url = mockAuthenticatedFetch.mock.calls[0][0]
    expect(url).toContain('q=python')
    expect(url).toContain('country=de')
    expect(url).toContain('date_posted=week')
    expect(url).toContain('employment_type=FULLTIME')
    expect(url).toContain('remote_only=true')
  })

  // --- 5. handleSearch does not include default "all" values ---
  it('omits date_posted and employment_type when set to "all"', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'java')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    const url = mockAuthenticatedFetch.mock.calls[0][0]
    expect(url).not.toContain('date_posted=')
    expect(url).not.toContain('employment_type=')
    expect(url).not.toContain('remote_only=')
  })

  // --- 6. handleSearch with empty query is skipped ---
  it('does not search with empty query', async () => {
    const { result } = renderHook(() => useJSearchLive())

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(mockAuthenticatedFetch).not.toHaveBeenCalled()
  })

  // --- 7. handleSearch with whitespace-only query is skipped ---
  it('does not search with whitespace-only query', async () => {
    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', '   ')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(mockAuthenticatedFetch).not.toHaveBeenCalled()
  })

  // --- 8. handleSearch error ---
  it('shows toast and clears results on search error', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('API error'))

    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'go')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.jsearchLive.errorSearch')
  })

  // --- 9. Cooldown prevents search ---
  it('blocks search during cooldown period', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'react')
    })

    // First search triggers cooldown
    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.cooldown).toBe(true)
    expect(result.current.cooldownTimer).toBe(12)

    // Second search during cooldown should be blocked
    await act(async () => {
      await result.current.handleSearch()
    })

    // Only one fetch call (the first one)
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  // --- 10. Cooldown timer counts down ---
  it('counts down cooldown timer and disables cooldown at zero', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'test')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.cooldown).toBe(true)
    expect(result.current.cooldownTimer).toBe(12)

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.cooldownTimer).toBe(7)
    expect(result.current.cooldown).toBe(true)

    // Advance remaining 7 seconds
    act(() => {
      vi.advanceTimersByTime(7000)
    })

    expect(result.current.cooldownTimer).toBe(0)
    expect(result.current.cooldown).toBe(false)
  })

  // --- 11. Search handles different response shapes ---
  it('handles response with data field', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse({ data: [{ id: 1, title: 'Job A' }] })
    )

    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'test')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.results).toEqual([{ id: 1, title: 'Job A' }])
  })

  it('handles response with results field', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse({ results: [{ id: 2, title: 'Job B' }] })
    )

    const { result } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'test')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.results).toEqual([{ id: 2, title: 'Job B' }])
  })

  // --- 12. formatSalary ---
  it('formats salary with min and max', () => {
    const { result } = renderHook(() => useJSearchLive())

    const formatted = result.current.formatSalary({
      job_min_salary: 50000,
      job_max_salary: 100000,
      job_salary_currency: 'CHF',
      job_salary_period: 'year',
    })
    expect(formatted).toBe('CHF 50,000-100,000/year')
  })

  it('formats salary with min only', () => {
    const { result } = renderHook(() => useJSearchLive())

    const formatted = result.current.formatSalary({
      job_min_salary: 60000,
      job_salary_currency: 'EUR',
      job_salary_period: 'year',
    })
    expect(formatted).toBe('EUR 60,000+/year')
  })

  it('formats salary with max only', () => {
    const { result } = renderHook(() => useJSearchLive())

    const formatted = result.current.formatSalary({
      job_max_salary: 80000,
      job_salary_currency: 'USD',
      job_salary_period: 'year',
    })
    expect(formatted).toBe('USD 80,000/year')
  })

  it('returns null when no salary fields', () => {
    const { result } = renderHook(() => useJSearchLive())

    expect(result.current.formatSalary({})).toBeNull()
  })

  it('uses fallback currency and period', () => {
    const { result } = renderHook(() => useJSearchLive())

    const formatted = result.current.formatSalary({
      min_salary: 40000,
      max_salary: 70000,
    })
    expect(formatted).toBe('USD 40,000-70,000/year')
  })

  // --- 13. Cleanup on unmount ---
  it('cleans up interval on unmount', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result, unmount } = renderHook(() => useJSearchLive())

    act(() => {
      result.current.handleFieldChange('query', 'test')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.cooldown).toBe(true)

    // Unmount should not throw
    unmount()

    // Advancing timers after unmount should be safe
    act(() => {
      vi.advanceTimersByTime(20000)
    })
  })
})
