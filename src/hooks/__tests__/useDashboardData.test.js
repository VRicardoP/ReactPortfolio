import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDashboardData } from '../useDashboardData'

// Mock the useAuth hook to provide authenticatedFetch
const mockAuthenticatedFetch = vi.fn()
const mockCoreSources = vi.hoisted(() => ({}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
  }),
}))

// Mock jobSources to avoid loading all 20 sources in tests
vi.mock('../../config/jobSources', () => ({
  CORE_SOURCE_BY_KEY: mockCoreSources,
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
  normalizeCoreJob: (job, source) => ({ ...job, id: job.id, source }),
}))

// DT-210: las 20 fuentes se piden en UNA sola llamada a este endpoint, que
// responde la copia guardada que el worker refresca por su cuenta.
const JOB_SOURCES_PATH = '/api/v1/dashboard/job-sources'

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const source of Object.keys(mockCoreSources)) delete mockCoreSources[source]
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

    mockAuthenticatedFetch
      // Call 1: stats
      .mockResolvedValueOnce(makeMockResponse(mockStats))
      // Call 2: map-data
      .mockResolvedValueOnce(makeMockResponse(mockMapData))
      // Call 3: chat analytics
      .mockResolvedValueOnce(makeMockResponse(mockChatAnalytics))
      // Call 4: job sources (UNA sola llamada para las 20 fuentes)
      .mockResolvedValueOnce(makeMockResponse({ sources: {}, warnings: [] }))

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
      .mockResolvedValueOnce(makeMockResponse({ sources: {}, warnings: [] }))

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

  it('loads transferred sources from Core and preserves the vacancy identity', async () => {
    mockCoreSources.testjobs = 'core-testjobs'
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse({}))
      .mockResolvedValueOnce(makeMockResponse([]))
      .mockResolvedValueOnce(makeMockResponse({ general: null, top_questions: [], timeline_daily: [], by_country: [] }))
      .mockResolvedValueOnce(makeMockResponse({
        sources: { testjobs: { data: [{ id: 'core-vacancy', title: 'Current role' }] } },
        warnings: [],
      }))

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => expect(result.current.jobData.testjobs).toBeDefined())
    // DT-210: una sola llamada trae las 20 fuentes; cuál de ellas viene del
    // catálogo del núcleo lo decide el backend, no la URL que pide el navegador.
    expect(mockAuthenticatedFetch).toHaveBeenNthCalledWith(4, JOB_SOURCES_PATH)
    expect(result.current.jobData.testjobs._normalized[0]).toMatchObject({
      id: 'core-vacancy',
      source: 'testjobs',
    })
  })

  it('includes jobData in the result', async () => {
    const mockJobData = [{ id: 1, title: 'React Developer' }]

    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse({ total: 5 }))
      .mockResolvedValueOnce(makeMockResponse([]))
      .mockResolvedValueOnce(makeMockResponse({ general: null, top_questions: [], timeline_daily: [], by_country: [] }))
      // Job sources — UNA llamada con las 20 fuentes dentro
      .mockResolvedValueOnce(makeMockResponse({ sources: { testjobs: mockJobData }, warnings: [] }))

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // jobData se rellena de una vez al llegar la respuesta, normalizado ya
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
  it('DT-187: enciende el error cuando falla la fuente esencial', async () => {
    // Antes era IMPOSIBLE: cada promesa tenia su propio .catch devolviendo un
    // valor de reserva, asi que Promise.all no podia rechazar y el catch que
    // ponia el error no se ejecutaba nunca. Con el servidor caido el panel se
    // pintaba vacio en vez de mostrar su pantalla de error.
    mockAuthenticatedFetch.mockRejectedValue(new Error('Network down'))

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBeTruthy()
    expect(result.current.warnings).toContain('stats')
  })

  it('DT-187: un refetch no borra los avisos de las fuentes de empleo', async () => {
    // Las fuentes de empleo las anota la llamada de fondo; setWarnings las
    // SOBRESCRIBIA en cada recarga de lo esencial (que dispara el canal de
    // avisos en directo), aunque siguieran sin datos.
    mockAuthenticatedFetch.mockImplementation((url) => {
      if (url === JOB_SOURCES_PATH) {
        // DT-210: el backend es quien marca una fuente concreta como caida
        // dentro de su copia guardada; aqui se simula esa fuente (testjobs)
        // sin datos, en vez de un fallo de red aparte por fuente.
        return Promise.resolve(makeMockResponse({ sources: {}, warnings: ['testjobs'] }))
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => {
      expect(result.current.warnings).toContain('testjobs')
    })

    // Ahora falla TAMBIEN lo esencial y se dispara la recarga silenciosa por el
    // mismo evento que usa el canal de avisos en directo.
    mockAuthenticatedFetch.mockRejectedValue(new Error('todo caido'))
    window.dispatchEvent(new Event('dashboard-data-stale'))

    // Los avisos nuevos se suman a los que ya habia: con el codigo anterior,
    // 'testjobs' desaparecia al reemplazarse la lista entera.
    await waitFor(() => {
      expect(result.current.warnings).toContain('stats')
    }, { timeout: 5000 })
    expect(result.current.warnings).toContain('testjobs')
  })
})
