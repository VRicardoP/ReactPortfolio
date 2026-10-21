import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import useTypewriter from '../useTypewriter'

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty text', () => {
    const { result } = renderHook(() => useTypewriter('Hello', 50))
    expect(result.current).toBe('')
  })

  it('types out text character by character', () => {
    const { result } = renderHook(() => useTypewriter('Hi', 50))

    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current).toBe('H')

    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current).toBe('Hi')
  })

  it('completes the full text', () => {
    const text = 'ABC'
    const { result } = renderHook(() => useTypewriter(text, 10))

    // Each character requires its own timer tick + state update
    for (let i = 0; i < text.length; i++) {
      act(() => { vi.advanceTimersByTime(10) })
    }
    expect(result.current).toBe('ABC')
  })

  it('respects custom speed', () => {
    const { result } = renderHook(() => useTypewriter('X', 200))

    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe('')

    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe('X')
  })

  // --- DT-198: la invariante que el fallo violaba ---
  //
  // En el navegador la portada mostraba "cicente Ricardo Pau Valero > Portfolio":
  // la "V" perdida y una "c" delante, porque un temporizador rancio del texto
  // anterior ("Loading portfolio...") añadía la letra de SU índice sobre un
  // texto ya reiniciado. Lo que se perdía es que lo mostrado fuera un PREFIJO
  // del texto vigente, y eso es lo que se fija aquí.
  //
  // HONESTIDAD SOBRE ESTE TEST: no falla con la versión anterior del hook. La
  // carrera necesita que el temporizador dispare antes de su propia limpieza, y
  // el `act` de React vacía los efectos primero, así que con temporizadores
  // falsos es inalcanzable. La prueba de aceptación del arreglo es el e2e
  // `shows typewriter with "Vicente"`. Esto fija la PROPIEDAD, que con la
  // salida derivada de (text, currentIndex) es cierta por construcción.
  it('DT-198 · lo mostrado es siempre un prefijo del texto vigente', () => {
    const CARGA = 'Loading portfolio...'
    const REAL = 'Vicente Ricardo Pau Valero > Portfolio'
    const { result, rerender } = renderHook(({ t }) => useTypewriter(t, 50), {
      initialProps: { t: CARGA },
    })
    // Dos tandas de 50 ms, no una de 100: el temporizador siguiente no se
    // programa hasta que React re-renderiza al cerrar el `act`, así que un
    // único avance largo dispara UN solo tick.
    act(() => { vi.advanceTimersByTime(50) })
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current).toBe('Lo')

    rerender({ t: REAL })
    for (let i = 0; i < 45; i++) {
      act(() => { vi.advanceTimersByTime(50) })
      expect(REAL.startsWith(result.current)).toBe(true)
    }
    expect(result.current).toBe(REAL)
  })

  it('DT-198 · un texto más corto no deja cola del anterior', () => {
    const { result, rerender } = renderHook(({ t }) => useTypewriter(t, 10), {
      initialProps: { t: 'Portfolio completo' },
    })
    for (let i = 0; i < 25; i++) act(() => { vi.advanceTimersByTime(10) })
    expect(result.current).toBe('Portfolio completo')

    rerender({ t: 'Hola' })
    for (let i = 0; i < 10; i++) act(() => { vi.advanceTimersByTime(10) })
    expect(result.current).toBe('Hola')
  })
})
