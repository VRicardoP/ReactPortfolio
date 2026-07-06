import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useAIJobMatch, { TAB_RESULTS, TAB_SKILLS_GAP } from '../useAIJobMatch'

// Characterization tests for the logic extracted from AIJobMatchWindow:
// analysis lifecycle, pagination, translation cache and guarded tabs.

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

describe('useAIJobMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts empty on the results tab', () => {
    const { result } = renderHook(() => useAIJobMatch())
    expect(result.current.results).toEqual([])
    expect(result.current.metadata).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.page).toBe(0)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.activeTab).toBe(TAB_RESULTS)
    expect(result.current.llmUnavailable).toBe(false)
  })

  it('runAnalysis stores results + metadata and resets the page', async () => {
    mockAuthenticatedFetch.mockResolvedValue(
      okJson({ results: makeJobs(3), metadata: { total_jobs_analyzed: 3, total_time_ms: 1200 } })
    )
    const { result } = renderHook(() => useAIJobMatch())

    await act(async () => {
      await result.current.runAnalysis()
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai-match/analyze?top_k=50&rerank_top=30&batch_size=10')
    )
    expect(result.current.results).toHaveLength(3)
    expect(result.current.metadata).toEqual({ total_jobs_analyzed: 3, total_time_ms: 1200 })
    expect(result.current.page).toBe(0)
    expect(result.current.loading).toBe(false)
  })

  it('runAnalysis failure sets error and does NOT reset page or results', async () => {
    // First: successful analysis with 2 pages, move to page 1
    mockAuthenticatedFetch.mockResolvedValueOnce(okJson({ results: makeJobs(15), metadata: null }))
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })
    act(() => result.current.nextPage())
    expect(result.current.page).toBe(1)

    // Then: a failing re-analysis
    mockAuthenticatedFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await act(async () => {
      await result.current.runAnalysis()
    })

    expect(result.current.error).toBe('HTTP 500')
    expect(result.current.results).toHaveLength(15) // previous results kept
    expect(result.current.page).toBe(1) // page NOT reset on error
  })

  it('paginates with AI_MATCH_PAGE_SIZE slices', async () => {
    mockAuthenticatedFetch.mockResolvedValue(okJson({ results: makeJobs(25), metadata: null }))
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })

    expect(result.current.totalPages).toBe(3)
    expect(result.current.pagedResults).toHaveLength(10)
    expect(result.current.pagedResults[0].id).toBe('j0')

    act(() => result.current.nextPage())
    expect(result.current.pagedResults[0].id).toBe('j10')

    act(() => result.current.prevPage())
    expect(result.current.pagedResults[0].id).toBe('j0')
  })

  it('toggleExpanded expands a global slot and collapses it on repeat', () => {
    const { result } = renderHook(() => useAIJobMatch())
    act(() => result.current.toggleExpanded(12))
    expect(result.current.expandedId).toBe(12)
    act(() => result.current.toggleExpanded(12))
    expect(result.current.expandedId).toBeNull()
  })

  it('translateTitles posts only untranslated titles of the current page and merges additively', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(okJson({ results: makeJobs(2), metadata: null }))
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })

    mockAuthenticatedFetch.mockResolvedValueOnce(
      okJson({ translations: { 'Job 0': 'Trabajo 0' } })
    )
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
    mockAuthenticatedFetch.mockResolvedValueOnce(
      okJson({ translations: { 'Job 1': 'Trabajo 1' } })
    )
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
    mockAuthenticatedFetch.mockResolvedValueOnce(okJson({ results: makeJobs(1), metadata: null }))
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })
    mockAuthenticatedFetch.mockResolvedValueOnce(okJson({ translations: { 'Job 0': 'X' } }))
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
    mockAuthenticatedFetch.mockResolvedValueOnce(okJson({ results: makeJobs(1), metadata: null }))
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })

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
    mockAuthenticatedFetch.mockResolvedValue(
      okJson({ results: makeJobs(2, { llm_unavailable: true }), metadata: null })
    )
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })

    expect(result.current.llmUnavailable).toBe(true)
    act(() => result.current.selectTab(TAB_SKILLS_GAP))
    expect(result.current.activeTab).toBe(TAB_RESULTS) // blocked
  })

  it('forces back to Results if the LLM becomes unavailable while Skills Gap is open', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(okJson({ results: makeJobs(2), metadata: null }))
    const { result } = renderHook(() => useAIJobMatch())
    await act(async () => {
      await result.current.runAnalysis()
    })
    act(() => result.current.selectTab(TAB_SKILLS_GAP))
    expect(result.current.activeTab).toBe(TAB_SKILLS_GAP)

    // Re-analysis returns llm_unavailable results -> effect resets the tab
    mockAuthenticatedFetch.mockResolvedValueOnce(
      okJson({ results: makeJobs(2, { llm_unavailable: true }), metadata: null })
    )
    await act(async () => {
      await result.current.runAnalysis()
    })

    await waitFor(() => {
      expect(result.current.activeTab).toBe(TAB_RESULTS)
    })
  })
})
