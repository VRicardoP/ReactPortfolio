import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useAIJobMatch, { TAB_RESULTS, TAB_SKILLS_GAP } from '../useAIJobMatch'

// Characterization tests for the AI match hook: async analysis lifecycle
// (start + progress polling + persisted result), pagination, translation
// cache and guarded tabs.

const mockAuthenticatedFetch = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    isAuthenticated: true,
  }),
}))

const makeJobs = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `j${i}`, title: `Job ${i}`, ...extra }))

const okJson = (body) => ({ ok: true, json: () => Promise.resolve(body) })

const storedResult = (jobs, metadata = null) =>
  okJson({ available: true, data: { results: jobs, metadata } })

const noStoredResult = () => okJson({ available: false, data: null })

/**
 * Route the fetch mock by URL substring. Later calls can override a route by
 * passing a function responder (called with url, opts). First match wins.
 */
const routeFetch = (routes) => {
  mockAuthenticatedFetch.mockImplementation((url, opts) => {
    for (const [pattern, responder] of routes) {
      if (url.includes(pattern)) {
        return Promise.resolve(
          typeof responder === 'function' ? responder(url, opts) : responder
        )
      }
    }
    return Promise.resolve({ ok: false, status: 404 })
  })
}

const idleMountRoutes = [
  ['/analyze/result', noStoredResult()],
  ['/analyze/progress', okJson({ state: 'idle' })],
]

describe('useAIJobMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts empty on the results tab when no stored result exists', async () => {
    routeFetch(idleMountRoutes)
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalled()
    })
    expect(result.current.results).toEqual([])
    expect(result.current.metadata).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.page).toBe(0)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.activeTab).toBe(TAB_RESULTS)
    expect(result.current.llmUnavailable).toBe(false)
  })

  it('loads the persisted result automatically on mount', async () => {
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(3), { total_jobs_analyzed: 3, computed_at: '2026-07-19T10:00:00Z' })],
      ['/analyze/progress', okJson({ state: 'idle' })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => {
      expect(result.current.results).toHaveLength(3)
    })
    expect(result.current.metadata.computed_at).toBe('2026-07-19T10:00:00Z')
    expect(result.current.loading).toBe(false)
  })

  it('attaches to an already-running analysis on mount and loads its result', async () => {
    // Mount check sees 'running'; the follow-up poll sees 'done'
    let progressCalls = 0
    routeFetch([
      ['/analyze/result', () =>
        progressCalls < 2 ? noStoredResult() : storedResult(makeJobs(2))],
      ['/analyze/progress', () => {
        progressCalls += 1
        return progressCalls === 1
          ? okJson({ state: 'running', stage: 'embedding', percent: 40, jobs_done: 800, jobs_total: 2000 })
          : okJson({ state: 'done', percent: 100 })
      }],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => {
      expect(result.current.results).toHaveLength(2)
    })
    expect(result.current.loading).toBe(false)
  })

  it('runAnalysis starts the background run, polls to done and stores results', async () => {
    routeFetch([
      ['/analyze/start', okJson({ status: 'started' })],
      ['/analyze/result', storedResult(makeJobs(3), { total_jobs_analyzed: 3, total_time_ms: 1200 })],
      ['/analyze/progress', okJson({ state: 'done', percent: 100 })],
    ])
    const { result } = renderHook(() => useAIJobMatch())

    await act(async () => {
      await result.current.runAnalysis()
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai-match/analyze/start?force=true'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.current.results).toHaveLength(3)
    expect(result.current.metadata).toEqual({ total_jobs_analyzed: 3, total_time_ms: 1200 })
    expect(result.current.page).toBe(0)
    expect(result.current.loading).toBe(false)
  })

  it('start failure sets error and keeps previous results and page', async () => {
    // Seed 15 results via mount, move to page 1
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(15))],
      ['/analyze/progress', okJson({ state: 'idle' })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => expect(result.current.results).toHaveLength(15))
    act(() => result.current.nextPage())
    expect(result.current.page).toBe(1)

    routeFetch([
      ['/analyze/start', { ok: false, status: 500 }],
    ])
    await act(async () => {
      await result.current.runAnalysis()
    })

    expect(result.current.error).toBe('HTTP 500')
    expect(result.current.results).toHaveLength(15) // previous results kept
    expect(result.current.page).toBe(1) // page NOT reset on error
  })

  it('a background run ending in error surfaces the server error message', async () => {
    routeFetch([
      ['/analyze/start', okJson({ status: 'started' })],
      ['/analyze/progress', okJson({ state: 'error', error: 'No cached jobs to analyze' })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })
    expect(result.current.error).toBe('No cached jobs to analyze')
    expect(result.current.loading).toBe(false)
  })

  it('paginates with AI_MATCH_PAGE_SIZE slices', async () => {
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(25))],
      ['/analyze/progress', okJson({ state: 'idle' })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => expect(result.current.results).toHaveLength(25))

    expect(result.current.totalPages).toBe(3)
    expect(result.current.pagedResults).toHaveLength(10)
    expect(result.current.pagedResults[0].id).toBe('j0')

    act(() => result.current.nextPage())
    expect(result.current.pagedResults[0].id).toBe('j10')

    act(() => result.current.prevPage())
    expect(result.current.pagedResults[0].id).toBe('j0')
  })

  it('toggleExpanded expands a global slot and collapses it on repeat', async () => {
    routeFetch(idleMountRoutes)
    const { result } = renderHook(() => useAIJobMatch())
    act(() => result.current.toggleExpanded(12))
    expect(result.current.expandedId).toBe(12)
    act(() => result.current.toggleExpanded(12))
    expect(result.current.expandedId).toBeNull()
  })

  it('translateTitles posts only untranslated titles of the current page and merges additively', async () => {
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(2))],
      ['/analyze/progress', okJson({ state: 'idle' })],
      ['/translate-titles', okJson({ translations: { 'Job 0': 'Trabajo 0' } })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => expect(result.current.results).toHaveLength(2))

    await act(async () => {
      await result.current.translateTitles()
    })

    expect(mockAuthenticatedFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/v1/ai-match/translate-titles'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ titles: ['Job 0', 'Job 1'] }),
      })
    )
    expect(result.current.translatedTitles).toEqual({ 'Job 0': 'Trabajo 0' })

    // Second call: 'Job 0' already cached -> only 'Job 1' sent
    routeFetch([
      ['/translate-titles', okJson({ translations: { 'Job 1': 'Trabajo 1' } })],
    ])
    await act(async () => {
      await result.current.translateTitles()
    })
    expect(mockAuthenticatedFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ body: JSON.stringify({ titles: ['Job 1'] }) })
    )
    // Additive merge, nothing cleared
    expect(result.current.translatedTitles).toEqual({ 'Job 0': 'Trabajo 0', 'Job 1': 'Trabajo 1' })
  })

  it('translateTitles is a no-op when every title on the page is already translated', async () => {
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(1))],
      ['/analyze/progress', okJson({ state: 'idle' })],
      ['/translate-titles', okJson({ translations: { 'Job 0': 'X' } })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => expect(result.current.results).toHaveLength(1))
    await act(async () => {
      await result.current.translateTitles()
    })
    mockAuthenticatedFetch.mockClear()

    await act(async () => {
      await result.current.translateTitles()
    })
    expect(mockAuthenticatedFetch).not.toHaveBeenCalled()
  })

  it('translation failure is silent: no error state, cache untouched', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(1))],
      ['/analyze/progress', okJson({ state: 'idle' })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => expect(result.current.results).toHaveLength(1))

    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('boom'))
    await act(async () => {
      await result.current.translateTitles()
    })

    expect(result.current.error).toBeNull() // analyze error state untouched
    expect(result.current.translatedTitles).toEqual({})
    expect(result.current.translating).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('selectTab blocks Skills Gap while the LLM is unavailable', async () => {
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(2, { llm_unavailable: true }))],
      ['/analyze/progress', okJson({ state: 'idle' })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => expect(result.current.results).toHaveLength(2))

    expect(result.current.llmUnavailable).toBe(true)
    act(() => result.current.selectTab(TAB_SKILLS_GAP))
    expect(result.current.activeTab).toBe(TAB_RESULTS) // blocked
  })

  it('forces back to Results if the LLM becomes unavailable while Skills Gap is open', async () => {
    routeFetch([
      ['/analyze/result', storedResult(makeJobs(2))],
      ['/analyze/progress', okJson({ state: 'idle' })],
    ])
    const { result } = renderHook(() => useAIJobMatch())
    await waitFor(() => expect(result.current.results).toHaveLength(2))
    act(() => result.current.selectTab(TAB_SKILLS_GAP))
    expect(result.current.activeTab).toBe(TAB_SKILLS_GAP)

    // Re-analysis returns llm_unavailable results -> effect resets the tab
    routeFetch([
      ['/analyze/start', okJson({ status: 'started' })],
      ['/analyze/result', storedResult(makeJobs(2, { llm_unavailable: true }))],
      ['/analyze/progress', okJson({ state: 'done', percent: 100 })],
    ])
    await act(async () => {
      await result.current.runAnalysis()
    })

    await waitFor(() => {
      expect(result.current.activeTab).toBe(TAB_RESULTS)
    })
  })
})
