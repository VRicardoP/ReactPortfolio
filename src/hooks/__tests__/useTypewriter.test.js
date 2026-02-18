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
})
