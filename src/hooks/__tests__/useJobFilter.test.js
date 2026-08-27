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

// Unified pagination envelope (single contract for local offset engine and
// core keyset feed): local pages carry total + has_more + next_cursor null,
// core pages carry total null + next_cursor.
const localPage = (items, { total, hasMore }) => ({
  data: items,
  metadata: { total, has_more: hasMore, next_cursor: null },
})
const corePage = (items, { nextCursor }) => ({
  data: items,
  metadata: { total: null, has_more: nextCursor != null, next_cursor: nextCursor },
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
    expect(result.current.total).toBe(null)
    expect(result.current.hasMore).toBe(false)
    expect(result.current.nextCursor).toBe(null)
    expect(result.current.loading).toBe(false)
    expect(result.current.searched).toBe(false)
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

  // --- 3. handleSearch success (local envelope) ---
  it('performs search and sets results with pagination metadata', async () => {
    const items = [
      { id: 1, title: 'React Dev' },
      { id: 2, title: 'Node Dev' },
    ]
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse(localPage(items, { total: 42, hasMore: true }))
    )

    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'react')
      result.current.handleFilterChange('country', 'CH')
    })

    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.results).toEqual(items)
    expect(result.current.total).toBe(42)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.nextCursor).toBe(null)
    expect(result.current.loading).toBe(false)
    expect(result.current.searched).toBe(true)

    // Verify URL params
    const url = mockAuthenticatedFetch.mock.calls[0][0]
    expect(url).toContain('q=react')
    expect(url).toContain('country=CH')
    expect(url).toContain('limit=20')
    expect(url).toContain('offset=0')
    expect(url).not.toContain('cursor=')
  })

  // --- 4. handleLoadMore in local (offset) mode appends the next page ---
  it('loads more via accumulated offset when there is no cursor', async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) => ({ id: i }))
    const secondPage = [{ id: 20, title: 'Page 2 job' }]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(
        makeMockResponse(localPage(firstPage, { total: 21, hasMore: true }))
      )
      .mockResolvedValueOnce(
        makeMockResponse(localPage(secondPage, { total: 21, hasMore: false }))
      )

    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'python')
    })
    await act(async () => {
      await result.current.handleSearch()
    })
    await act(async () => {
      await result.current.handleLoadMore()
    })

    expect(result.current.results).toHaveLength(21)
    expect(result.current.results[20]).toEqual(secondPage[0])
    expect(result.current.hasMore).toBe(false)
    const url = mockAuthenticatedFetch.mock.calls[1][0]
    expect(url).toContain('offset=20') // accumulated results length
    expect(url).not.toContain('cursor=')
  })

  // --- 5. handleLoadMore in core (cursor) mode follows next_cursor ---
  it('loads more via next_cursor when the backend provides one', async () => {
    const firstPage = [{ id: 'a', title: 'Core job 1' }]
    const secondPage = [{ id: 'b', title: 'Core job 2' }]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(
        makeMockResponse(corePage(firstPage, { nextCursor: 'opaque-cursor-1' }))
      )
      .mockResolvedValueOnce(
        makeMockResponse(corePage(secondPage, { nextCursor: null }))
      )

    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'python')
    })
    await act(async () => {
      await result.current.handleSearch()
    })

    // core envelope: unknown total, cursor stored
    expect(result.current.total).toBe(null)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.nextCursor).toBe('opaque-cursor-1')

    await act(async () => {
      await result.current.handleLoadMore()
    })

    expect(result.current.results).toEqual([...firstPage, ...secondPage])
    expect(result.current.hasMore).toBe(false)
    expect(result.current.nextCursor).toBe(null)
    const url = mockAuthenticatedFetch.mock.calls[1][0]
    expect(url).toContain('cursor=opaque-cursor-1')
    // the keyset cursor already encodes the position: no offset alongside it
    expect(url).not.toContain('offset=')
  })

  // --- 6. handleSearch error ---
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
    expect(result.current.total).toBe(null)
    expect(result.current.hasMore).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.searched).toBe(true)
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.jobFilter.errorSearch')
  })

  // --- 7. handleLoadMore error keeps the pages already shown ---
  it('keeps existing results when load more fails', async () => {
    const firstPage = [{ id: 1, title: 'Kept job' }]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(
        makeMockResponse(localPage(firstPage, { total: 40, hasMore: true }))
      )
      .mockRejectedValueOnce(new Error('Load more failed'))

    const { result } = renderHook(() => useJobFilter())

    await act(async () => {
      await result.current.handleSearch()
    })
    await act(async () => {
      await result.current.handleLoadMore()
    })

    expect(result.current.results).toEqual(firstPage)
    // P3-2 (auditoría G9): antes se apagaba `hasMore` aquí. Un "cargar más" que
    // falla no prueba que no haya más páginas, y apagarlo dejaba al usuario sin
    // camino de reintento. La posición se conserva para poder repetir el intento.
    expect(result.current.hasMore).toBe(true)
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.jobFilter.errorSearch')
  })

  // --- 8. handleClear resets everything ---
  it('clears filters, results, and search state', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse(localPage([{ id: 1, title: 'Job' }], { total: 1, hasMore: false }))
    )

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
    expect(result.current.total).toBe(null)
    expect(result.current.hasMore).toBe(false)
    expect(result.current.nextCursor).toBe(null)
    expect(result.current.searched).toBe(false)
  })

  // --- 9. handleSave calls onSaveSearch callback ---
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

  // --- 10. handleSave does nothing without callback ---
  it('does nothing when onSaveSearch is not provided', () => {
    const { result } = renderHook(() => useJobFilter())

    // Should not throw
    act(() => {
      result.current.handleSave()
    })
  })

  // --- 11. hasFilters computed correctly ---
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

  // --- 12. has_more fallback when the envelope omits it ---
  it('derives hasMore from a full page when metadata lacks has_more', async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ id: i }))
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse({ data: fullPage, metadata: { total: 45 } })
    )

    const { result } = renderHook(() => useJobFilter())

    act(() => {
      result.current.handleFilterChange('q', 'test')
    })
    await act(async () => {
      await result.current.handleSearch()
    })

    expect(result.current.hasMore).toBe(true)
  })

  // --- 13. buildQueryParams includes all active filters ---
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

    const qs = result.current.buildQueryParams()
    expect(qs).toContain('q=react')
    expect(qs).toContain('country=CH')
    expect(qs).toContain('city=Zurich')
    expect(qs).toContain('salary_min=50000')
    expect(qs).toContain('salary_max=100000')
    expect(qs).toContain('remote_only=true')
    expect(qs).toContain('limit=20')
    expect(qs).toContain('offset=0')
  })

  // --- 14. buildQueryParams omits empty filters, cursor replaces offset ---
  it('buildQueryParams omits empty filter values', () => {
    const { result } = renderHook(() => useJobFilter())

    const qs = result.current.buildQueryParams()
    expect(qs).not.toContain('q=')
    expect(qs).not.toContain('country=')
    expect(qs).not.toContain('city=')
    expect(qs).not.toContain('salary_min=')
    expect(qs).not.toContain('salary_max=')
    expect(qs).not.toContain('remote_only=')
    expect(qs).toContain('limit=20')
    expect(qs).toContain('offset=0')
  })

  it('buildQueryParams sends cursor instead of offset when given one', () => {
    const { result } = renderHook(() => useJobFilter())

    const qs = result.current.buildQueryParams({ cursor: 'abc123' })
    expect(qs).toContain('cursor=abc123')
    expect(qs).not.toContain('offset=')
  })

  // --- 15. formatSalary formats correctly ---
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

// ---------------------------------------------------------------------------
// P2-1 auditoria G8 — el token de secuencia, la mitad del CLIENTE
// ---------------------------------------------------------------------------

describe('useJobFilter — token de secuencia (P2-1 G8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  const paginaConToken = (items, { hasMore, sequence }) => ({
    data: items,
    metadata: { total: null, has_more: hasMore, next_cursor: null, sequence },
  })

  // MUERDE sin el fix: el backend acuña el token desde G7 y lo publica en
  // `metadata.sequence`, pero NINGUN cliente lo leia ni lo reenviaba, asi que
  // el 100 % del trafico caia en el respaldo por IP — el codigo de ANTES del
  // fix — y dos pestañas del mismo host podian mezclar corpus e identidades
  // entre el motor core y el local.
  it('reenvia metadata.sequence como ?seq= en el "cargar mas"', async () => {
    mockAuthenticatedFetch
      .mockResolvedValueOnce(
        makeMockResponse(paginaConToken([{ id: 1 }], { hasMore: true, sequence: 'tok-1' }))
      )
      .mockResolvedValueOnce(
        makeMockResponse(paginaConToken([{ id: 2 }], { hasMore: false, sequence: undefined }))
      )

    const { result } = renderHook(() => useJobFilter())

    await act(async () => { await result.current.handleSearch() })
    expect(result.current.sequence).toBe('tok-1')
    // La pagina 1 ABRE la secuencia: no puede reenviar token (el servidor
    // estrena uno igualmente, y mandarlo solo confundiria la lectura).
    expect(mockAuthenticatedFetch.mock.calls[0][0]).not.toContain('seq=')

    await act(async () => { await result.current.handleLoadMore() })
    expect(mockAuthenticatedFetch.mock.calls[1][0]).toContain('seq=tok-1')
  })

  it('conserva el token de la pagina 1 aunque el "cargar mas" no lo republique', async () => {
    mockAuthenticatedFetch
      .mockResolvedValueOnce(
        makeMockResponse(paginaConToken([{ id: 1 }], { hasMore: true, sequence: 'tok-2' }))
      )
      .mockResolvedValueOnce(
        makeMockResponse(paginaConToken([{ id: 2 }], { hasMore: true, sequence: undefined }))
      )
      .mockResolvedValueOnce(
        makeMockResponse(paginaConToken([{ id: 3 }], { hasMore: false, sequence: undefined }))
      )

    const { result } = renderHook(() => useJobFilter())
    await act(async () => { await result.current.handleSearch() })
    await act(async () => { await result.current.handleLoadMore() })
    await act(async () => { await result.current.handleLoadMore() })

    expect(result.current.sequence).toBe('tok-2')
    expect(mockAuthenticatedFetch.mock.calls[2][0]).toContain('seq=tok-2')
  })

  it('una busqueda nueva descarta el token de la secuencia anterior', async () => {
    mockAuthenticatedFetch
      .mockResolvedValueOnce(
        makeMockResponse(paginaConToken([{ id: 1 }], { hasMore: true, sequence: 'tok-3' }))
      )
      .mockResolvedValueOnce(
        makeMockResponse(paginaConToken([{ id: 9 }], { hasMore: false, sequence: 'tok-4' }))
      )

    const { result } = renderHook(() => useJobFilter())
    await act(async () => { await result.current.handleSearch() })
    await act(async () => { await result.current.handleSearch() })

    expect(result.current.sequence).toBe('tok-4')
    expect(mockAuthenticatedFetch.mock.calls[1][0]).not.toContain('seq=')
  })

  it('handleClear olvida el token', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse(paginaConToken([{ id: 1 }], { hasMore: true, sequence: 'tok-5' }))
    )
    const { result } = renderHook(() => useJobFilter())
    await act(async () => { await result.current.handleSearch() })
    act(() => { result.current.handleClear() })
    expect(result.current.sequence).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// P2-1 auditoria externa 2026-08-27 — respuestas de busqueda fuera de orden
// ---------------------------------------------------------------------------

describe('useJobFilter — respuestas fuera de orden (P2-1 externa)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  const paginaSecuencia = (items, sequence) => ({
    data: items,
    metadata: {
      total: null,
      has_more: true,
      next_cursor: `cur-${sequence}`,
      sequence,
    },
  })

  /** Respuesta que el test decide cuando entregar, para forzar el desorden. */
  const diferida = () => {
    let resolve
    const promise = new Promise(r => { resolve = r })
    return { promise, resolve }
  }

  // MUERDE sin el fix: `fetchPage` confirmaba CUALQUIER respuesta que llegara,
  // sin atarla a la generacion de filtros que la lanzo. La busqueda vieja
  // aterrizaba encima de la nueva y dejaba estado hibrido:
  //   filters.q = "new", results[0] = "OLD", sequence = "seq-old".
  it('una respuesta vieja no sobrescribe los resultados de la busqueda nueva', async () => {
    const a = diferida()
    const b = diferida()
    mockAuthenticatedFetch
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise)

    const { result } = renderHook(() => useJobFilter())

    act(() => { result.current.handleFilterChange('q', 'old') })
    let busquedaA
    act(() => { busquedaA = result.current.handleSearch() })

    act(() => { result.current.handleFilterChange('q', 'new') })
    let busquedaB
    act(() => { busquedaB = result.current.handleSearch() })

    // B, la vigente, resuelve primero; A, la vieja, llega despues.
    await act(async () => {
      b.resolve(makeMockResponse(paginaSecuencia([{ id: 'NEW' }], 'seq-new')))
      await busquedaB
    })
    await act(async () => {
      a.resolve(makeMockResponse(paginaSecuencia([{ id: 'OLD' }], 'seq-old')))
      await busquedaA
    })

    expect(result.current.filters.q).toBe('new')
    expect(result.current.results).toEqual([{ id: 'NEW' }])
    expect(result.current.sequence).toBe('seq-new')
    expect(result.current.nextCursor).toBe('cur-seq-new')
    expect(result.current.loading).toBe(false)
  })

  // MUERDE sin el fix: con `sequence` contaminado por la respuesta vieja, el
  // "cargar mas" pide la pagina 2 con los filtros nuevos y el token viejo —
  // justo la mezcla de corpus que el token vino a evitar.
  it('el "cargar mas" siguiente usa el cursor y la secuencia de la busqueda vigente', async () => {
    const a = diferida()
    const b = diferida()
    mockAuthenticatedFetch
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise)
      .mockResolvedValueOnce(makeMockResponse(paginaSecuencia([{ id: 'NEW-2' }], 'seq-new')))

    const { result } = renderHook(() => useJobFilter())

    act(() => { result.current.handleFilterChange('q', 'old') })
    let busquedaA
    act(() => { busquedaA = result.current.handleSearch() })
    act(() => { result.current.handleFilterChange('q', 'new') })
    let busquedaB
    act(() => { busquedaB = result.current.handleSearch() })

    await act(async () => {
      b.resolve(makeMockResponse(paginaSecuencia([{ id: 'NEW' }], 'seq-new')))
      await busquedaB
    })
    await act(async () => {
      a.resolve(makeMockResponse(paginaSecuencia([{ id: 'OLD' }], 'seq-old')))
      await busquedaA
    })

    await act(async () => { await result.current.handleLoadMore() })

    const urlPagina2 = mockAuthenticatedFetch.mock.calls[2][0]
    expect(urlPagina2).toContain('seq=seq-new')
    expect(urlPagina2).toContain('cur-seq-new')
    expect(urlPagina2).not.toContain('seq-old')
  })

  // MUERDE sin el fix: `handleClear` no invalidaba lo pendiente, asi que la
  // respuesta en vuelo repoblaba una vista que el usuario acababa de vaciar.
  it('handleClear invalida la peticion en vuelo', async () => {
    const a = diferida()
    mockAuthenticatedFetch.mockReturnValueOnce(a.promise)

    const { result } = renderHook(() => useJobFilter())
    act(() => { result.current.handleFilterChange('q', 'old') })
    let busquedaA
    act(() => { busquedaA = result.current.handleSearch() })

    act(() => { result.current.handleClear() })

    await act(async () => {
      a.resolve(makeMockResponse(paginaSecuencia([{ id: 'OLD' }], 'seq-old')))
      await busquedaA
    })

    expect(result.current.results).toEqual([])
    expect(result.current.sequence).toBeNull()
    expect(result.current.nextCursor).toBeNull()
    expect(result.current.searched).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  // --- Regresión P3-2 (auditoría G9 2026-08-27) ---
  // El fallo cerrado del token de secuencia (501) llega al hook como una
  // excepción de `authenticatedFetch`. Apagar `hasMore` ahí dejaba al usuario
  // con la primera página de un corpus de cientos y sin ningún camino de
  // reintento: un "cargar más" que falla no prueba que no haya más páginas.
  it('F1 · un "cargar más" que falla conserva el botón y la posición para reintentar', async () => {
    mockAuthenticatedFetch.mockImplementationOnce(() =>
      Promise.resolve(makeMockResponse({
        data: [{ id: 'p1' }],
        metadata: { next_cursor: 'c1', sequence: 's1', has_more: true },
      }))
    )
    mockAuthenticatedFetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Sequence expired'))
    )

    const { result } = renderHook(() => useJobFilter())
    await act(async () => { await result.current.handleSearch() })
    expect(result.current.hasMore).toBe(true)

    await act(async () => { await result.current.handleLoadMore() })

    expect(result.current.results.map(r => r.id)).toEqual(['p1'])
    expect(result.current.hasMore).toBe(true)
    expect(result.current.nextCursor).toBe('c1')
    expect(result.current.sequence).toBe('s1')
    expect(result.current.loading).toBe(false)

    // Y el reintento vuelve a pedir exactamente la misma página.
    mockAuthenticatedFetch.mockImplementationOnce(() =>
      Promise.resolve(makeMockResponse({
        data: [{ id: 'p2' }],
        metadata: { next_cursor: 'c2', has_more: false },
      }))
    )
    await act(async () => { await result.current.handleLoadMore() })
    expect(result.current.results.map(r => r.id)).toEqual(['p1', 'p2'])
    expect(result.current.sequence).toBe('s1')
  })
})

// ---------------------------------------------------------------------------
// Contrapartida de G10-9 — el buscador que SÍ pagina no lleva la marca
// ---------------------------------------------------------------------------

describe('useJobFilter — abre secuencia porque sí pagina', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // `oneshot` es exclusivo de la vista previa de una búsqueda guardada. Si se
  // colara aquí, la página 1 dejaría de anotar qué motor la sirvió y el propio
  // "cargar más" de este hook fallaría cerrado o mezclaría corpus.
  it('G10-9b · ni la búsqueda ni el "cargar más" declaran `oneshot`', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse(corePage([{ id: 1 }], { nextCursor: 'cur-2' }))
    )
    const { result } = renderHook(() => useJobFilter())
    await act(async () => { await result.current.handleSearch() })

    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse(corePage([{ id: 2 }], { nextCursor: null }))
    )
    await act(async () => { await result.current.handleLoadMore() })

    const urls = mockAuthenticatedFetch.mock.calls.map(c => c[0])
    expect(urls).toHaveLength(2)
    for (const url of urls) expect(url).not.toContain('oneshot')
  })
})
