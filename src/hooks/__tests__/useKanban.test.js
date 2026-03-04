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
