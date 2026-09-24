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

describe('useJobApplication — cada acción dice la verdad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthenticatedFetch.mockResolvedValue(makeMockResponse({ id: 'app-1' }))
    window.open = vi.fn()
  })

  const estado = () => renderHook(() => useJobApplication())

  const cuerpoEnviado = () => JSON.parse(mockAuthenticatedFetch.mock.calls[0][1].body)

  it('arranca sin nada marcado', () => {
    const { result } = estado()
    expect(result.current.interestedIds.size).toBe(0)
    expect(result.current.savedIds.size).toBe(0)
    expect(result.current.openedIds.size).toBe(0)
  })

  it('«me interesa» registra el estado interested', async () => {
    const { result } = estado()
    await act(async () => { await result.current.handleInterested(makeJob()) })
    expect(cuerpoEnviado().status).toBe('interested')
    expect(result.current.interestedIds.has('job-1')).toBe(true)
  })

  it('«guardar» registra saved', async () => {
    const { result } = estado()
    await act(async () => { await result.current.handleSave(makeJob()) })
    expect(cuerpoEnviado().status).toBe('saved')
    expect(result.current.savedIds.has('job-1')).toBe(true)
  })

  // ESTA es la regresión que se quiere impedir. Antes, `handleApply` abría la
  // URL y mandaba status:'applied', así que el panel mostraba como aplicadas
  // ofertas a las que nadie había aplicado.
  it('abrir la oferta NO la da por aplicada', async () => {
    const { result } = estado()
    await act(async () => { await result.current.handleOpenOffer(makeJob()) })

    expect(window.open).toHaveBeenCalledWith(
      'https://example.com/apply', '_blank', 'noopener,noreferrer',
    )
    const enviados = mockAuthenticatedFetch.mock.calls.map(c => JSON.parse(c[1].body).status)
    expect(enviados).not.toContain('applied')
    expect(enviados).toEqual(['saved'])
  })

  it('ninguna acción manda nunca «applied»', async () => {
    const { result } = estado()
    await act(async () => {
      await result.current.handleInterested(makeJob({ id: 'a' }))
      await result.current.handleSave(makeJob({ id: 'b' }))
      await result.current.handleOpenOffer(makeJob({ id: 'c' }))
    })
    const enviados = mockAuthenticatedFetch.mock.calls.map(c => JSON.parse(c[1].body).status)
    expect(enviados).not.toContain('applied')
  })

  it('una oferta sin URL no abre ventana', async () => {
    const { result } = estado()
    await act(async () => { await result.current.handleOpenOffer(makeJob({ url: null })) })
    expect(window.open).not.toHaveBeenCalled()
  })

  it('no duplica: la misma acción dos veces registra una', async () => {
    const { result } = estado()
    await act(async () => { await result.current.handleSave(makeJob()) })
    await act(async () => { await result.current.handleSave(makeJob()) })
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1)
  })

  it('si el registro falla, la oferta no queda marcada', async () => {
    mockAuthenticatedFetch.mockRejectedValue(new Error('caído'))
    const { result } = estado()
    await act(async () => { await result.current.handleSave(makeJob()) })
    expect(result.current.savedIds.size).toBe(0)
  })

  it('aunque el registro falle, la oferta ya se abrió', async () => {
    mockAuthenticatedFetch.mockRejectedValue(new Error('caído'))
    const { result } = estado()
    await act(async () => { await result.current.handleOpenOffer(makeJob()) })
    expect(window.open).toHaveBeenCalled()
  })
})
