import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useJobApplication from '../useJobApplication'

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

// Mock i18next
const mockT = (key) => key
const mockI18n = { language: 'en', changeLanguage: vi.fn() }
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
}))

const makeMockResponse = (data, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
})

const makeJob = (overrides = {}) => ({
  id: 'job-1',
  title: 'React Developer',
  company: 'TestCorp',
  url: 'https://example.com/apply',
  source: 'remotive',
  description: 'Build React apps',
  ...overrides,
})

describe('useJobApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // --- 1. Initial state ---
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useJobApplication())

    expect(result.current.appliedIds).toEqual(new Set())
    expect(result.current.savedIds).toEqual(new Set())
    expect(typeof result.current.handleApply).toBe('function')
    expect(typeof result.current.handleSave).toBe('function')
  })

  // --- 2. handleApply opens URL and saves application ---
  it('opens job URL and posts application on handleApply', async () => {
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({ id: 1 }))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    await act(async () => {
      await result.current.handleApply(job)
    })

    // URL opened
    expect(mockOpen).toHaveBeenCalledWith(
      'https://example.com/apply',
      '_blank',
      'noopener,noreferrer'
    )

    // POST made with correct body
    const callArgs = mockAuthenticatedFetch.mock.calls[0]
    expect(callArgs[0]).toContain('/api/v1/applications/')
    expect(callArgs[1].method).toBe('POST')
    const body = JSON.parse(callArgs[1].body)
    expect(body.title).toBe('React Developer')
    expect(body.company).toBe('TestCorp')
    expect(body.url).toBe('https://example.com/apply')
    expect(body.source).toBe('remotive')
    expect(body.status).toBe('applied')

    // ID tracked
    expect(result.current.appliedIds.has('job-1')).toBe(true)

    mockOpen.mockRestore()
  })

  // --- 3. handleApply does not duplicate ---
  it('does not post duplicate application for already-applied job', async () => {
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse({ id: 1 }))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    // Apply first time
    await act(async () => {
      await result.current.handleApply(job)
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)

    // Apply same job again — URL opens but no POST
    await act(async () => {
      await result.current.handleApply(job)
    })

    // URL opened twice, but POST only once
    expect(mockOpen).toHaveBeenCalledTimes(2)
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)

    mockOpen.mockRestore()
  })

  // --- 4. handleApply works without URL ---
  it('handles job without URL (does not open window)', async () => {
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({ id: 1 }))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob({ url: null })

    await act(async () => {
      await result.current.handleApply(job)
    })

    expect(mockOpen).not.toHaveBeenCalled()
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)

    const body = JSON.parse(mockAuthenticatedFetch.mock.calls[0][1].body)
    expect(body.url).toBeNull()

    mockOpen.mockRestore()
  })

  // --- 5. handleApply silently fails on error ---
  it('silently handles API error on handleApply (URL still opens)', async () => {
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    // Should not throw
    await act(async () => {
      await result.current.handleApply(job)
    })

    expect(mockOpen).toHaveBeenCalled()
    // ID not tracked because the POST failed
    expect(result.current.appliedIds.has('job-1')).toBe(false)

    mockOpen.mockRestore()
  })

  // --- 6. handleSave saves job ---
  it('saves job to board on handleSave', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({ id: 1 }, true))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    await act(async () => {
      await result.current.handleSave(job)
    })

    const callArgs = mockAuthenticatedFetch.mock.calls[0]
    expect(callArgs[0]).toContain('/api/v1/applications/')
    const body = JSON.parse(callArgs[1].body)
    expect(body.status).toBe('saved')
    expect(body.title).toBe('React Developer')
    expect(body.company).toBe('TestCorp')
    expect(body.description).toBe('Build React apps')

    expect(result.current.savedIds.has('job-1')).toBe(true)
  })

  // --- 7. handleSave does not duplicate ---
  it('does not save duplicate job', async () => {
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse({ id: 1 }, true))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    await act(async () => {
      await result.current.handleSave(job)
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)

    // Save same job again — skipped
    await act(async () => {
      await result.current.handleSave(job)
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  // --- 8. handleSave with missing fields uses defaults ---
  it('handles job with missing optional fields', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({ id: 1 }, true))

    const { result } = renderHook(() => useJobApplication())
    const job = { id: 'job-2' } // minimal job

    await act(async () => {
      await result.current.handleSave(job)
    })

    const body = JSON.parse(mockAuthenticatedFetch.mock.calls[0][1].body)
    expect(body.title).toBe('')
    expect(body.company).toBe('')
    expect(body.url).toBeNull()
    expect(body.source).toBeNull()
    expect(body.description).toBeNull()
  })

  // --- 9. handleSave does not track on non-ok response ---
  it('does not track savedId when response is not ok', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse({}, false))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    await act(async () => {
      await result.current.handleSave(job)
    })

    expect(result.current.savedIds.has('job-1')).toBe(false)
  })

  // --- 10. handleSave silently fails on error ---
  it('silently handles API error on handleSave', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    // Should not throw
    await act(async () => {
      await result.current.handleSave(job)
    })

    expect(result.current.savedIds.has('job-1')).toBe(false)
  })

  // --- 11. Concurrent saves are deduplicated via savingRef ---
  it('deduplicates concurrent save calls for the same job', async () => {
    let resolveFirst
    mockAuthenticatedFetch.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveFirst = resolve
      })
    )

    const { result } = renderHook(() => useJobApplication())
    const job = makeJob()

    // Start first save (will hang)
    let firstSave
    act(() => {
      firstSave = result.current.handleSave(job)
    })

    // Start second save while first is in-flight — should be skipped
    await act(async () => {
      await result.current.handleSave(job)
    })

    // Only one fetch call made
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)

    // Resolve the first save
    await act(async () => {
      resolveFirst(makeMockResponse({ id: 1 }, true))
      await firstSave
    })

    expect(result.current.savedIds.has('job-1')).toBe(true)
  })

  // --- 12. Independent jobs can be saved separately ---
  it('tracks multiple different saved jobs independently', async () => {
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse({ id: 1 }, true))

    const { result } = renderHook(() => useJobApplication())

    await act(async () => {
      await result.current.handleSave(makeJob({ id: 'job-a' }))
    })
    await act(async () => {
      await result.current.handleSave(makeJob({ id: 'job-b' }))
    })

    expect(result.current.savedIds.has('job-a')).toBe(true)
    expect(result.current.savedIds.has('job-b')).toBe(true)
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(2)
  })
})
