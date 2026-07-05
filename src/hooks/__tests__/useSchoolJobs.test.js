import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useSchoolJobs from '../useSchoolJobs'

// Characterization tests: pin the current behavior of the school-jobs hook
// (mount fetch of schools + jobs, error handling, and the deferred re-poll after
// POST /refresh) before any refactor of the schools dashboard windows.

const { mockAuthenticatedFetch, authState } = vi.hoisted(() => ({
  mockAuthenticatedFetch: vi.fn(),
  authState: { isAuthenticated: true },
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    isAuthenticated: authState.isAuthenticated,
  }),
}))

const SCHOOLS = [{ id: 1, name: 'Schule Zürich' }]
const JOBS = [{ id: 'j1', title: 'Informatiker' }]

// Route the mock by URL so the number of calls per test doesn't matter.
function routeByUrl() {
  mockAuthenticatedFetch.mockImplementation((url) => {
    if (url.endsWith('/refresh')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    if (url.includes('/jobs/all')) return Promise.resolve({ ok: true, json: () => Promise.resolve(JOBS) })
    return Promise.resolve({ ok: true, json: () => Promise.resolve(SCHOOLS) })
  })
}

describe('useSchoolJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.isAuthenticated = true
    routeByUrl()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches schools and jobs on mount and clears loading', async () => {
    const { result } = renderHook(() => useSchoolJobs())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.schools).toEqual(SCHOOLS)
    expect(result.current.jobs).toEqual(JOBS)
    expect(result.current.error).toBeNull()
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(2)
  })

  it('coerces non-array responses to empty arrays', async () => {
    mockAuthenticatedFetch.mockImplementation((url) => {
      const body = url.includes('/jobs/all') ? { error: 'nope' } : null
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
    })
    const { result } = renderHook(() => useSchoolJobs())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.schools).toEqual([])
    expect(result.current.jobs).toEqual([])
  })

  it('records an error when a fetch rejects', async () => {
    mockAuthenticatedFetch.mockRejectedValue(new Error('Network down'))
    const { result } = renderHook(() => useSchoolJobs())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network down')
  })

  it('does not fetch when unauthenticated', async () => {
    authState.isAuthenticated = false
    const { result } = renderHook(() => useSchoolJobs())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockAuthenticatedFetch).not.toHaveBeenCalled()
    expect(result.current.schools).toEqual([])
  })

  it('triggerScrape posts /refresh, sets refreshing, then re-polls after the delay', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSchoolJobs())

    // Flush the mount fetch under fake timers.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const callsAfterMount = mockAuthenticatedFetch.mock.calls.length // 2

    await act(async () => {
      result.current.triggerScrape()
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.refreshing).toBe(true)
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      expect.stringContaining('/refresh'),
      expect.objectContaining({ method: 'POST' })
    )

    // Advance past the 8s poll delay: it re-fetches and clears refreshing.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000)
    })

    expect(result.current.refreshing).toBe(false)
    // POST /refresh + 2 re-poll fetches on top of the mount pair.
    expect(mockAuthenticatedFetch.mock.calls.length).toBe(callsAfterMount + 3)
  })
})
