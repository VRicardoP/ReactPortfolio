import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useKanban, { COLUMN_KEYS } from '../useKanban'

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

const makeApp = (overrides = {}) => ({
  id: 1,
  title: 'React Dev',
  company: 'ACME',
  url: 'https://example.com',
  status: 'saved',
  ...overrides,
})

/** Helper to create a minimal DataTransfer mock. */
const makeDataTransfer = () => ({
  effectAllowed: '',
  dropEffect: '',
})

/** Helper to create a minimal DragEvent-like object. */
const makeDragEvent = () => ({
  dataTransfer: makeDataTransfer(),
  preventDefault: vi.fn(),
})

describe('useKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // --- 1. COLUMN_KEYS export ---
  it('exports COLUMN_KEYS with all pipeline statuses', () => {
    expect(COLUMN_KEYS).toEqual([
      'saved', 'applied', 'phone_screen', 'technical', 'offer', 'rejected',
    ])
  })

  // --- 2. Initial fetch on mount ---
  it('fetches applications on mount and groups them', async () => {
    const mockApps = [
      makeApp({ id: 1, status: 'saved' }),
      makeApp({ id: 2, status: 'applied' }),
      makeApp({ id: 3, status: 'offer' }),
    ]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(mockApps))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(3)
    })

    expect(result.current.grouped.saved).toHaveLength(1)
    expect(result.current.grouped.applied).toHaveLength(1)
    expect(result.current.grouped.offer).toHaveLength(1)
    expect(result.current.grouped.phone_screen).toHaveLength(0)
    expect(result.current.grouped.technical).toHaveLength(0)
    expect(result.current.grouped.rejected).toHaveLength(0)
  })

  // --- 3. Fetch error shows toast ---
  it('shows toast and clears applications on fetch error', async () => {
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorLoad')
    })

    expect(result.current.applications).toEqual([])
  })

  // --- 4. Handles non-array response ---
  it('handles response with results field', async () => {
    const mockApps = [makeApp({ id: 1 })]
    mockAuthenticatedFetch.mockResolvedValueOnce(
      makeMockResponse({ results: mockApps })
    )

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })
  })

  // --- 5. Initial state ---
  it('returns correct initial state before fetch resolves', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useKanban())

    expect(result.current.applications).toEqual([])
    expect(result.current.draggedId).toBeNull()
    expect(result.current.addingTo).toBeNull()
    expect(result.current.newApp).toEqual({ title: '', company: '', url: '' })
    // All grouped columns should be empty arrays
    COLUMN_KEYS.forEach(key => {
      expect(result.current.grouped[key]).toEqual([])
    })
  })

  // --- 6. Drag and drop ---
  it('handles drag start by setting draggedId', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([makeApp({ id: 5 })]))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    const event = makeDragEvent()

    act(() => {
      result.current.handleDragStart(event, 5)
    })

    expect(result.current.draggedId).toBe(5)
    expect(event.dataTransfer.effectAllowed).toBe('move')
  })

  // --- 7. handleDragOver ---
  it('handleDragOver prevents default and sets dropEffect', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useKanban())
    const event = makeDragEvent()

    act(() => {
      result.current.handleDragOver(event)
    })

    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.dataTransfer.dropEffect).toBe('move')
  })

  // --- 8. handleDrop moves card optimistically ---
  it('moves card to target column on drop', async () => {
    const apps = [makeApp({ id: 1, status: 'saved' })]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse(apps)) // mount fetch
      .mockResolvedValueOnce(makeMockResponse({}))     // PATCH

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    // Start drag
    act(() => {
      result.current.handleDragStart(makeDragEvent(), 1)
    })

    // Drop on 'applied'
    const dropEvent = makeDragEvent()
    await act(async () => {
      await result.current.handleDrop(dropEvent, 'applied')
    })

    expect(dropEvent.preventDefault).toHaveBeenCalled()
    expect(result.current.grouped.applied).toHaveLength(1)
    expect(result.current.grouped.saved).toHaveLength(0)
    expect(result.current.draggedId).toBeNull()

    // Verify PATCH call
    const patchCall = mockAuthenticatedFetch.mock.calls[1]
    expect(patchCall[0]).toContain('/api/v1/applications/1')
    expect(patchCall[1].method).toBe('PATCH')
    const body = JSON.parse(patchCall[1].body)
    expect(body.status).toBe('applied')
  })

  // --- 9. handleDrop reverts on error ---
  it('reverts card position when drop API call fails', async () => {
    const apps = [makeApp({ id: 1, status: 'saved' })]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse(apps))     // mount fetch
      .mockRejectedValueOnce(new Error('PATCH failed'))   // PATCH

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    act(() => {
      result.current.handleDragStart(makeDragEvent(), 1)
    })

    await act(async () => {
      await result.current.handleDrop(makeDragEvent(), 'applied')
    })

    // Reverted back to 'saved'
    expect(result.current.grouped.saved).toHaveLength(1)
    expect(result.current.grouped.applied).toHaveLength(0)
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorMove')
  })

  // --- 10. handleDrop same column is no-op ---
  it('does nothing when dropping onto the same column', async () => {
    const apps = [makeApp({ id: 1, status: 'saved' })]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(apps))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    act(() => {
      result.current.handleDragStart(makeDragEvent(), 1)
    })

    await act(async () => {
      await result.current.handleDrop(makeDragEvent(), 'saved')
    })

    // No PATCH call (only mount fetch)
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    expect(result.current.draggedId).toBeNull()
  })

  // --- 11. handleDrop without draggedId is no-op ---
  it('does nothing on drop when no card is being dragged', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.handleDrop(makeDragEvent(), 'applied')
    })

    // No PATCH call
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  // --- 12. handleAdd creates new application ---
  it('creates a new application in the specified column', async () => {
    const created = makeApp({ id: 99, status: 'saved', title: 'New Job', company: 'NewCo' })
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse([]))      // mount fetch
      .mockResolvedValueOnce(makeMockResponse(created))  // POST

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    })

    // Fill form
    act(() => {
      result.current.handleNewAppChange('title', 'New Job')
      result.current.handleNewAppChange('company', 'NewCo')
      result.current.handleNewAppChange('url', 'https://newco.com')
    })

    await act(async () => {
      await result.current.handleAdd('saved')
    })

    // Application added
    expect(result.current.applications).toHaveLength(1)
    expect(result.current.applications[0]).toEqual(created)

    // Form reset
    expect(result.current.newApp).toEqual({ title: '', company: '', url: '' })
    expect(result.current.addingTo).toBeNull()

    // Verify POST body
    const postCall = mockAuthenticatedFetch.mock.calls[1]
    expect(postCall[1].method).toBe('POST')
    const body = JSON.parse(postCall[1].body)
    expect(body.title).toBe('New Job')
    expect(body.company).toBe('NewCo')
    expect(body.url).toBe('https://newco.com')
    expect(body.status).toBe('saved')
  })

  // --- 13. handleAdd requires title and company ---
  it('does not add when title is empty', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.handleNewAppChange('company', 'SomeCo')
    })

    await act(async () => {
      await result.current.handleAdd('saved')
    })

    // No POST call
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  it('does not add when company is empty', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.handleNewAppChange('title', 'Some Job')
    })

    await act(async () => {
      await result.current.handleAdd('saved')
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  // --- 14. handleAdd error shows toast ---
  it('shows toast on add error', async () => {
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse([]))       // mount
      .mockRejectedValueOnce(new Error('Create failed')) // POST

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    })

    act(() => {
      result.current.handleNewAppChange('title', 'Job')
      result.current.handleNewAppChange('company', 'Co')
    })

    await act(async () => {
      await result.current.handleAdd('saved')
    })

    expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorAdd')
  })

  // --- 15. handleMoveCard moves card to adjacent column ---
  it('moves card to next column via keyboard', async () => {
    const apps = [makeApp({ id: 1, status: 'saved' })]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse(apps))  // mount
      .mockResolvedValueOnce(makeMockResponse({}))    // PATCH

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    await act(async () => {
      await result.current.handleMoveCard(1, 1) // move right
    })

    expect(result.current.grouped.applied).toHaveLength(1)
    expect(result.current.grouped.saved).toHaveLength(0)
  })

  it('moves card to previous column via keyboard', async () => {
    const apps = [makeApp({ id: 1, status: 'applied' })]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse(apps))  // mount
      .mockResolvedValueOnce(makeMockResponse({}))    // PATCH

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    await act(async () => {
      await result.current.handleMoveCard(1, -1) // move left
    })

    expect(result.current.grouped.saved).toHaveLength(1)
    expect(result.current.grouped.applied).toHaveLength(0)
  })

  // --- 16. handleMoveCard at boundary is no-op ---
  it('does not move card beyond first column', async () => {
    const apps = [makeApp({ id: 1, status: 'saved' })]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(apps))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    await act(async () => {
      await result.current.handleMoveCard(1, -1) // move left from first column
    })

    // No PATCH call — still in saved
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    expect(result.current.grouped.saved).toHaveLength(1)
  })

  it('does not move card beyond last column', async () => {
    const apps = [makeApp({ id: 1, status: 'rejected' })]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(apps))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    await act(async () => {
      await result.current.handleMoveCard(1, 1) // move right from last column
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    expect(result.current.grouped.rejected).toHaveLength(1)
  })

  // --- 17. handleMoveCard reverts on error ---
  it('reverts card on move error', async () => {
    const apps = [makeApp({ id: 1, status: 'saved' })]
    mockAuthenticatedFetch
      .mockResolvedValueOnce(makeMockResponse(apps))     // mount
      .mockRejectedValueOnce(new Error('Move failed'))   // PATCH

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    await act(async () => {
      await result.current.handleMoveCard(1, 1)
    })

    expect(result.current.grouped.saved).toHaveLength(1)
    expect(result.current.grouped.applied).toHaveLength(0)
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorMove')
  })

  // --- 18. handleMoveCard with unknown app is no-op ---
  it('does nothing when moving unknown application', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([]))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.handleMoveCard(999, 1)
    })

    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  // --- 19. Grouped puts unknown status into saved ---
  it('groups applications with unknown status into saved column', async () => {
    const apps = [makeApp({ id: 1, status: 'unknown_status' })]
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(apps))

    const { result } = renderHook(() => useKanban())

    await waitFor(() => {
      expect(result.current.applications).toHaveLength(1)
    })

    expect(result.current.grouped.saved).toHaveLength(1)
  })

  // --- 20. handleNewAppChange updates form ---
  it('updates new application form fields', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useKanban())

    act(() => {
      result.current.handleNewAppChange('title', 'Frontend Dev')
    })
    expect(result.current.newApp.title).toBe('Frontend Dev')

    act(() => {
      result.current.handleNewAppChange('company', 'TechCo')
    })
    expect(result.current.newApp.company).toBe('TechCo')

    act(() => {
      result.current.handleNewAppChange('url', 'https://techco.com')
    })
    expect(result.current.newApp.url).toBe('https://techco.com')
  })

  // --- 21. setAddingTo ---
  it('sets addingTo column', () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useKanban())

    act(() => {
      result.current.setAddingTo('applied')
    })
    expect(result.current.addingTo).toBe('applied')

    act(() => {
      result.current.setAddingTo(null)
    })
    expect(result.current.addingTo).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Hipotesis 3 de la auditoria externa 2026-08-27 — rollback optimista solapado
// ---------------------------------------------------------------------------

describe('useKanban — rollback optimista con movimientos solapados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  /** PATCH que el test decide cuando resolver o rechazar. */
  const diferida = () => {
    let resolve
    let reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }

  const montarConDos = async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse([
      makeApp({ id: 1, status: 'saved' }),
      makeApp({ id: 2, status: 'saved' }),
    ]))
    const { result } = renderHook(() => useKanban())
    await waitFor(() => expect(result.current.applications).toHaveLength(2))
    return result
  }

  const estadoDe = (result, id) => result.current.applications.find(a => a.id === id).status

  // MUERDE sin el fix: el rollback restauraba la instantania COMPLETA tomada
  // antes del primer movimiento, asi que el fallo del antiguo borraba
  // visualmente el exito del posterior.
  it('el fallo de un movimiento antiguo no borra el exito de otro posterior (teclado)', async () => {
    const result = await montarConDos()

    const patch1 = diferida() // fallara
    const patch2 = diferida() // tendra exito
    mockAuthenticatedFetch
      .mockReturnValueOnce(patch1.promise)
      .mockReturnValueOnce(patch2.promise)

    let mov1
    let mov2
    act(() => { mov1 = result.current.handleMoveCard(1, 1) })
    act(() => { mov2 = result.current.handleMoveCard(2, 1) })

    await act(async () => {
      patch2.resolve(makeMockResponse({}))
      await mov2
    })
    await act(async () => {
      patch1.reject(new Error('PATCH 500'))
      await mov1
    })

    expect(estadoDe(result, 1)).toBe('saved')   // revertido, como debe
    expect(estadoDe(result, 2)).toBe('applied') // el exito sobrevive
  })

  // MUERDE sin el fix: el borrado tambien restauraba la instantania completa.
  it('el fallo de un borrado no revierte un movimiento posterior con exito', async () => {
    const result = await montarConDos()

    const del1 = diferida()  // fallara
    const patch2 = diferida() // tendra exito
    mockAuthenticatedFetch
      .mockReturnValueOnce(del1.promise)
      .mockReturnValueOnce(patch2.promise)

    let borrado
    let mov2
    act(() => { borrado = result.current.handleDelete(1) })
    act(() => { mov2 = result.current.handleMoveCard(2, 1) })

    await act(async () => {
      patch2.resolve(makeMockResponse({}))
      await mov2
    })
    await act(async () => {
      del1.reject(new Error('DELETE 500'))
      await borrado
    })

    // La tarjeta borrada vuelve a su sitio...
    expect(result.current.applications.map(a => a.id)).toEqual([1, 2])
    // ...y el movimiento posterior sigue en pie.
    expect(estadoDe(result, 2)).toBe('applied')
  })

  it('el fallo de un drop antiguo no borra el exito de otro posterior', async () => {
    const result = await montarConDos()

    const patch1 = diferida()
    const patch2 = diferida()
    mockAuthenticatedFetch
      .mockReturnValueOnce(patch1.promise)
      .mockReturnValueOnce(patch2.promise)

    let drop1
    let drop2
    act(() => {
      result.current.handleDragStart(makeDragEvent(), 1)
    })
    act(() => { drop1 = result.current.handleDrop(makeDragEvent(), 'applied') })
    act(() => {
      result.current.handleDragStart(makeDragEvent(), 2)
    })
    act(() => { drop2 = result.current.handleDrop(makeDragEvent(), 'applied') })

    await act(async () => {
      patch2.resolve(makeMockResponse({}))
      await drop2
    })
    await act(async () => {
      patch1.reject(new Error('PATCH 500'))
      await drop1
    })

    expect(estadoDe(result, 1)).toBe('saved')
    expect(estadoDe(result, 2)).toBe('applied')
  })

  // --- Regresión P2-4 (auditoría G9 2026-08-27) ---
  // El rollback quirúrgico acierta con tarjetas DISTINTAS, pero sobre la MISMA
  // tarjeta un PATCH que falla tarde pisa el movimiento posterior que el
  // servidor sí aceptó. Mover con la flecha dos veces es uso normal.
  const deferred = () => {
    let resolve, reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }

  const mountWithCards = async (cards) => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(cards))
    const hook = renderHook(() => useKanban())
    await waitFor(() => expect(hook.result.current.applications).toHaveLength(cards.length))
    return hook
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Las regresiones de abajo nacieron con el protocolo ANTERIOR —dos PATCH de
  // la MISMA tarjeta en vuelo a la vez, ordenados por generación de cliente—,
  // que la auditoría externa R2 (P2-1) tumbó: el orden que manda es el de
  // COMMIT en el servidor, y el cliente no lo ve. Con un solo PATCH en vuelo y
  // los destinos siguientes coalescidos, sus escenarios se reescriben, pero
  // NINGUNA garantía se afloja: se sigue midiendo que tras un fallo la vista no
  // quede por DELANTE del servidor (K1, G10-K2, G10-K3, G10-K4) ni por DETRÁS
  // de lo ya confirmado (G10-K5, G11-K2, G11-K3), y se añade lo que el
  // protocolo nuevo permite medir: qué sale por el cable y en qué orden.
  // El escenario del viejo G11-K1 —el 2º PATCH falla ANTES de que triunfe el
  // 1º— ya no es construible: el segundo no existe hasta que el primero
  // confirma. Su garantía es la que mide G10-K5.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Anota el destino de cada PATCH que SALE al cable y deja que el test decida
   * cuándo responde cada uno.
   */
  const registrador = () => {
    const enviados = []
    const vuelos = []
    mockAuthenticatedFetch.mockImplementation((url, opts) => {
      const d = deferred()
      enviados.push(JSON.parse(opts.body).status)
      vuelos.push(d)
      return d.promise
    })
    return { enviados, vuelos }
  }

  it('K1 · el fallo del PATCH en curso cancela el destino coalescido', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let mov
    await act(async () => { mov = result.current.handleMoveCard(1, 1) })  // saved → applied
    await act(async () => { result.current.handleMoveCard(1, 1) })        // applied → phone_screen

    // La vista avanza con las dos flechas, pero al cable solo ha salido una.
    expect(estadoDe(result, 1)).toBe('phone_screen')
    expect(red.enviados).toEqual(['applied'])

    await act(async () => { red.vuelos[0].reject(new Error('timeout')); await mov })

    // El primer destino no se persistió, así que el segundo —que se calculó
    // sobre él— no puede salir: la vista vuelve a donde está el servidor.
    expect(red.enviados).toEqual(['applied'])
    expect(estadoDe(result, 1)).toBe('saved')
    expect(mockShowToast).toHaveBeenCalledTimes(1)
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorMove')
  })

  it('K2 · tres flechas seguidas se coalescen en UN PATCH al último destino', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let mov
    await act(async () => { mov = result.current.handleMoveCard(1, 1) })  // → applied
    await act(async () => { result.current.handleMoveCard(1, 1) })        // → phone_screen
    await act(async () => { result.current.handleMoveCard(1, 1) })        // → technical
    expect(estadoDe(result, 1)).toBe('technical')
    expect(red.enviados).toEqual(['applied'])

    await act(async () => { red.vuelos[0].resolve(makeMockResponse({})) })
    // Confirmado el primero sale UNO solo, y hacia el último destino pedido:
    // los intermedios no se mandan.
    await waitFor(() => expect(red.enviados).toEqual(['applied', 'technical']))

    await act(async () => { red.vuelos[1].resolve(makeMockResponse({})); await mov })
    expect(estadoDe(result, 1)).toBe('technical')
  })

  it('K1b · el rollback sigue ocurriendo cuando el movimiento fallido es el último', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    mockAuthenticatedFetch.mockImplementationOnce(() => Promise.reject(new Error('boom')))

    await act(async () => { await result.current.handleMoveCard(1, 1) })

    expect(result.current.applications.find(a => a.id === 1).status).toBe('saved')
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorMove')
  })

  it('G10-K2 · tres flechas con el backend caído no dejan la vista dos columnas por delante', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let mov
    await act(async () => { mov = result.current.handleMoveCard(1, 1) })
    await act(async () => { result.current.handleMoveCard(1, 1) })
    await act(async () => { result.current.handleMoveCard(1, 1) })
    expect(estadoDe(result, 1)).toBe('technical')

    await act(async () => { red.vuelos[0].reject(new Error('sin red')); await mov })

    // Ningún PATCH persistió: el servidor sigue en `saved`, y avisa UNA vez.
    expect(estadoDe(result, 1)).toBe('saved')
    expect(mockShowToast).toHaveBeenCalledTimes(1)
  })

  it('G10-K3 · markApplied y moveCard comparten la COLA de la misma tarjeta', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let marcar
    await act(async () => { marcar = result.current.handleMarkApplied(1) })  // saved → applied
    await act(async () => { result.current.handleMoveCard(1, 1) })           // applied → phone_screen
    // Las cuatro puertas escriben en la misma cola: solo un PATCH en vuelo.
    expect(red.enviados).toEqual(['applied'])

    await act(async () => { red.vuelos[0].reject(new Error('sin red')); await marcar })

    expect(estadoDe(result, 1)).toBe('saved')
    expect(red.enviados).toEqual(['applied'])
  })

  it('G10-K4 · dos drops sobre la misma tarjeta devuelven al estado del servidor si el PATCH falla', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let drop1
    act(() => { result.current.handleDragStart(makeDragEvent(), 1) })
    await act(async () => { drop1 = result.current.handleDrop(makeDragEvent(), 'applied') })
    act(() => { result.current.handleDragStart(makeDragEvent(), 1) })
    await act(async () => { result.current.handleDrop(makeDragEvent(), 'offer') })
    expect(estadoDe(result, 1)).toBe('offer')
    expect(red.enviados).toEqual(['applied'])

    await act(async () => { red.vuelos[0].reject(new Error('sin red')); await drop1 })

    expect(estadoDe(result, 1)).toBe('saved')
  })

  // CONTROL: el ancla AVANZA con cada PATCH que el servidor acepta. Revertir
  // siempre al estado previo al primer vuelo dejaría la vista por DETRÁS.
  it('G10-K5 · si el primer PATCH triunfa, el fallo del coalescido revierte al destino confirmado', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let mov
    await act(async () => { mov = result.current.handleMoveCard(1, 1) })  // → applied
    await act(async () => { result.current.handleMoveCard(1, 1) })        // → phone_screen

    await act(async () => { red.vuelos[0].resolve(makeMockResponse({})) })  // servidor: applied
    await waitFor(() => expect(red.enviados).toEqual(['applied', 'phone_screen']))
    await act(async () => { red.vuelos[1].reject(new Error('sin red')); await mov })

    // El servidor tiene `applied`: ni `phone_screen` (mentiría por delante) ni
    // `saved` (mentiría por detrás).
    expect(estadoDe(result, 1)).toBe('applied')
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorMove')
  })

  it('G11-K2 · tres flechas: confirma el primero y falla el coalescido — manda lo CONFIRMADO', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let mov
    await act(async () => { mov = result.current.handleMoveCard(1, 1) })
    await act(async () => { result.current.handleMoveCard(1, 1) })
    await act(async () => { result.current.handleMoveCard(1, 1) })
    expect(estadoDe(result, 1)).toBe('technical')

    await act(async () => { red.vuelos[0].resolve(makeMockResponse({})) })
    await waitFor(() => expect(red.enviados).toEqual(['applied', 'technical']))
    await act(async () => { red.vuelos[1].reject(new Error('sin red')); await mov })

    expect(estadoDe(result, 1)).toBe('applied')
  })

  it('G11-K3 · lo mismo arrastrando: la cola vive en `mutateStatus`, no en cada puerta', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let drop1
    act(() => { result.current.handleDragStart(makeDragEvent(), 1) })
    await act(async () => { drop1 = result.current.handleDrop(makeDragEvent(), 'applied') })
    act(() => { result.current.handleDragStart(makeDragEvent(), 1) })
    await act(async () => { result.current.handleDrop(makeDragEvent(), 'offer') })

    await act(async () => { red.vuelos[0].resolve(makeMockResponse({})) })
    await waitFor(() => expect(red.enviados).toEqual(['applied', 'offer']))
    await act(async () => { red.vuelos[1].reject(new Error('sin red')); await drop1 })

    expect(estadoDe(result, 1)).toBe('applied')
  })

  it('G11-K4 · si el usuario relanza tras el fallo, manda el movimiento NUEVO', async () => {
    // El fallo anotado no puede reconciliar sobre un movimiento posterior que el
    // usuario sí pidió y el servidor sí aceptó.
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const red = registrador()

    let mov1, mov2
    await act(async () => { mov1 = result.current.handleMoveCard(1, 1) })  // saved → applied
    await act(async () => { red.vuelos[0].reject(new Error('sin red')); await mov1 })
    expect(estadoDe(result, 1)).toBe('saved')

    await act(async () => { mov2 = result.current.handleMoveCard(1, 1) })  // → applied otra vez
    await act(async () => { red.vuelos[1].resolve(makeMockResponse({})); await mov2 })

    expect(estadoDe(result, 1)).toBe('applied')
  })
})

// ===========================================================================
// Regresión P2-1 (auditoría externa R2 2026-08-28) — dos PATCH ABSOLUTOS de la
// misma tarjeta en vuelo a la vez no se pueden ordenar desde el cliente: si la
// red entrega antes el segundo, el servidor termina en el destino del PRIMERO
// y la vista muestra el del segundo. Ninguna generación local puede saberlo,
// porque el orden que decide es el de COMMIT remoto.
// ===========================================================================
describe('useKanban — un solo PATCH en vuelo por tarjeta', () => {
  const deferred = () => {
    let resolve, reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }
  const mountWithCards = async (cards) => {
    mockAuthenticatedFetch.mockResolvedValueOnce(makeMockResponse(cards))
    const hook = renderHook(() => useKanban())
    await waitFor(() => expect(hook.result.current.applications).toHaveLength(cards.length))
    return hook
  }
  const estadoDe = (r, id) => r.current.applications.find(a => a.id === id).status

  /**
   * Servidor de mentira: cada PATCH queda EN VUELO hasta que el test lo
   * confirma, y al confirmarlo escribe su destino. Así el orden de COMMIT lo
   * decide el test, que es justo lo que el cliente no controla.
   */
  const servidorFalso = () => {
    const estado = { status: 'saved' }
    const vuelos = []
    let simultaneos = 0
    let pico = 0
    mockAuthenticatedFetch.mockImplementation((url, opts) => {
      if (!opts || opts.method !== 'PATCH') return Promise.resolve(makeMockResponse({}))
      const destino = JSON.parse(opts.body).status
      const d = deferred()
      simultaneos += 1
      pico = Math.max(pico, simultaneos)
      vuelos.push({
        destino,
        hecho: false,
        commit() {
          this.hecho = true
          simultaneos -= 1
          estado.status = destino
          d.resolve(makeMockResponse({}))
        },
      })
      return d.promise
    })
    return { estado, vuelos, pico: () => pico }
  }

  beforeEach(() => { vi.clearAllMocks(); vi.restoreAllMocks() })

  it('P2-1 · dos movimientos seguidos: la vista no puede decir un destino que el servidor no tiene', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const servidor = servidorFalso()

    let mov1, mov2
    await act(async () => { mov1 = result.current.handleMoveCard(1, 1) })  // saved → applied
    await act(async () => { mov2 = result.current.handleMoveCard(1, 1) })  // applied → phone_screen

    // La red entrega los PATCH pendientes en orden INVERSO al de salida —el
    // peor caso—, y se repite mientras la serialización mande más.
    let pendientes = servidor.vuelos.filter(v => !v.hecho)
    while (pendientes.length) {
      for (let i = pendientes.length - 1; i >= 0; i -= 1) {
        const vuelo = pendientes[i]
        await act(async () => { vuelo.commit(); await Promise.resolve() })
      }
      pendientes = servidor.vuelos.filter(v => !v.hecho)
    }
    await act(async () => { await mov1; await mov2 })

    // Lo único innegociable: vista y servidor coinciden.
    expect(estadoDe(result, 1)).toBe(servidor.estado.status)
    // Y lo que persiste es lo ÚLTIMO que el usuario pidió, no lo primero.
    expect(servidor.estado.status).toBe('phone_screen')
    // La causa raíz: nunca dos PATCH de la misma tarjeta a la vez.
    expect(servidor.pico()).toBe(1)
  })

  it('P2-1b · lo mismo arrastrando y soltando: el protocolo es compartido', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const servidor = servidorFalso()

    let drop1, drop2
    act(() => { result.current.handleDragStart(makeDragEvent(), 1) })
    await act(async () => { drop1 = result.current.handleDrop(makeDragEvent(), 'applied') })
    act(() => { result.current.handleDragStart(makeDragEvent(), 1) })
    await act(async () => { drop2 = result.current.handleDrop(makeDragEvent(), 'offer') })

    let pendientes = servidor.vuelos.filter(v => !v.hecho)
    while (pendientes.length) {
      for (let i = pendientes.length - 1; i >= 0; i -= 1) {
        const vuelo = pendientes[i]
        await act(async () => { vuelo.commit(); await Promise.resolve() })
      }
      pendientes = servidor.vuelos.filter(v => !v.hecho)
    }
    await act(async () => { await drop1; await drop2 })

    expect(estadoDe(result, 1)).toBe(servidor.estado.status)
    expect(servidor.estado.status).toBe('offer')
    expect(servidor.pico()).toBe(1)
  })

  it('P2-1c · tarjetas DISTINTAS siguen viajando en paralelo', async () => {
    // La serialización es POR TARJETA: no puede convertir el tablero en una
    // cola global.
    const { result } = await mountWithCards([
      makeApp({ id: 1, status: 'saved' }),
      makeApp({ id: 2, status: 'saved' }),
    ])
    const servidor = servidorFalso()

    let mov1, mov2
    await act(async () => { mov1 = result.current.handleMoveCard(1, 1) })
    await act(async () => { mov2 = result.current.handleMoveCard(2, 1) })
    expect(servidor.vuelos).toHaveLength(2)
    expect(servidor.pico()).toBe(2)

    await act(async () => { servidor.vuelos[0].commit(); servidor.vuelos[1].commit(); await mov1; await mov2 })
    expect(estadoDe(result, 1)).toBe('applied')
    expect(estadoDe(result, 2)).toBe('applied')
  })
})
