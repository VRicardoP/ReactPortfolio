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

  it('K1 · misma tarjeta, dos movimientos: el fallo tardío del primero no pisa al segundo', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const firstPatch = deferred()
    mockAuthenticatedFetch.mockImplementationOnce(() => firstPatch.promise)
    mockAuthenticatedFetch.mockImplementationOnce(() => Promise.resolve(makeMockResponse({})))

    let pFirst
    await act(async () => { pFirst = result.current.handleMoveCard(1, 1) })   // saved → applied
    await act(async () => { await result.current.handleMoveCard(1, 1) })      // applied → phone_screen (OK)
    expect(result.current.applications.find(a => a.id === 1).status).toBe('phone_screen')

    await act(async () => { firstPatch.reject(new Error('timeout')); await pFirst })

    // El servidor está en phone_screen: la vista no puede decir otra cosa.
    expect(result.current.applications.find(a => a.id === 1).status).toBe('phone_screen')
  })

  it('K2 · tres movimientos solapados sobre la misma tarjeta no caen en cascada', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    const g1 = deferred()
    const g2 = deferred()
    mockAuthenticatedFetch.mockImplementationOnce(() => g1.promise)
    mockAuthenticatedFetch.mockImplementationOnce(() => g2.promise)
    mockAuthenticatedFetch.mockImplementationOnce(() => Promise.resolve(makeMockResponse({})))

    let p1, p2
    await act(async () => { p1 = result.current.handleMoveCard(1, 1) })   // → applied
    await act(async () => { p2 = result.current.handleMoveCard(1, 1) })   // → phone_screen
    await act(async () => { await result.current.handleMoveCard(1, 1) })  // → technical (OK)
    expect(result.current.applications.find(a => a.id === 1).status).toBe('technical')

    await act(async () => { g2.reject(new Error('b')); await p2 })
    await act(async () => { g1.reject(new Error('a')); await p1 })

    expect(result.current.applications.find(a => a.id === 1).status).toBe('technical')
  })

  it('K1b · el rollback sigue ocurriendo cuando el movimiento fallido es el último', async () => {
    const { result } = await mountWithCards([makeApp({ id: 1, status: 'saved' })])
    mockAuthenticatedFetch.mockImplementationOnce(() => Promise.reject(new Error('boom')))

    await act(async () => { await result.current.handleMoveCard(1, 1) })

    expect(result.current.applications.find(a => a.id === 1).status).toBe('saved')
    expect(mockShowToast).toHaveBeenCalledWith('dashboard.kanban.errorMove')
  })
})
