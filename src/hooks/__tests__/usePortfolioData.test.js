import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import usePortfolioData from '../usePortfolioData'

// The hook tries the API first, then falls back to static files.

// El idioma vigente lo controla el test: el hook recarga cuando `i18n.language`
// cambia, y ese es el disparador de la regresión C5.
let currentLang = 'en'
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { get language() { return currentLang } },
  }),
}))

describe('usePortfolioData', () => {
  beforeEach(() => {
    currentLang = 'en'
    global.fetch = vi.fn()
  })

  it('starts in loading state', () => {
    global.fetch.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePortfolioData())
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns data from API when available', async () => {
    const mockData = { name: 'Vicente', skills: ['React'] }
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('falls back to static file when API fails', async () => {
    const mockData = { name: 'Vicente', skills: ['React'] }
    // API call fails
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // Static file succeeds
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('returns error when both API and static file fail', async () => {
    // API call fails
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // Static file also fails
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 })

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Failed to load portfolio data')
  })

  it('returns error on complete network failure', async () => {
    // API call throws
    global.fetch.mockRejectedValueOnce(new Error('API unreachable'))
    // Static file also throws
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePortfolioData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  // --- Regresión P2-3 (auditoría G9 2026-08-27) ---
  // Es el portfolio PÚBLICO: si la respuesta de un idioma abandonado aterriza
  // tarde, todo el contenido queda en un idioma distinto del que muestra el
  // conmutador, y así se queda hasta que el usuario vuelva a cambiarlo.
  it('C5 · cambiar de idioma dos veces deja el contenido en el idioma vigente', async () => {
    let resolveSpanish
    const spanishFlight = new Promise((resolve) => { resolveSpanish = resolve })
    global.fetch = vi.fn((url) => {
      const target = String(url)
      if (target.includes('lang=es')) return spanishFlight
      if (target.includes('lang=de')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ lang: 'DE' }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ lang: 'EN' }) })
    })

    const { result, rerender } = renderHook(() => usePortfolioData())
    await waitFor(() => expect(result.current.data?.lang).toBe('EN'))

    currentLang = 'es'
    await act(async () => { rerender() })
    currentLang = 'de'
    await act(async () => { rerender() })
    await waitFor(() => expect(result.current.data?.lang).toBe('DE'))

    await act(async () => {
      resolveSpanish({ ok: true, json: () => Promise.resolve({ lang: 'ES' }) })
      await new Promise(r => setTimeout(r, 10))
    })

    expect(result.current.data?.lang).toBe('DE')
  })

  // --- Regresión G10-8 (auditoría G10 2026-08-27) ---
  // `App.jsx` pinta la pantalla de error ANTES de mirar `data`, y `error` nunca
  // se reiniciaba al empezar una carga nueva: un idioma que falla dejaba el
  // portfolio PÚBLICO en pantalla de error aunque el siguiente cargara bien.
  it('G10-P2 · volver a un idioma que carga bien limpia la pantalla de error', async () => {
    global.fetch = vi.fn((url) => {
      const target = String(url)
      if (target.includes('lang=en')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'EN' }) })
      }
      // El idioma roto agota sus tres intentos: API, estático y respaldo.
      return Promise.resolve({ ok: false, status: 500 })
    })

    const { result, rerender } = renderHook(() => usePortfolioData())
    await waitFor(() => expect(result.current.data?.name).toBe('EN'))

    currentLang = 'es'
    await act(async () => { rerender() })
    await waitFor(() => expect(result.current.error).toBe('Failed to load portfolio data'))

    currentLang = 'en'
    await act(async () => { rerender() })
    await waitFor(() => expect(result.current.data?.name).toBe('EN'))

    expect(result.current.error).toBeNull()
  })
})
