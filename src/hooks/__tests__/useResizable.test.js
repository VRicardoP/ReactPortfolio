import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import useResizable from '../useResizable'

const makeWindowRef = (overrides = {}) => ({
  current: {
    getBoundingClientRect: () => ({
      left: 100,
      top: 100,
      width: 400,
      height: 300,
      ...overrides,
    }),
    style: {},
    classList: { add: vi.fn(), remove: vi.fn() },
  },
})

const makePointerEvent = (overrides = {}) => {
  const captured = new Set()
  const currentTarget = {
    setPointerCapture: vi.fn(id => captured.add(id)),
    hasPointerCapture: vi.fn(id => captured.has(id)),
    releasePointerCapture: vi.fn(id => captured.delete(id)),
  }
  return {
    pointerId: 7,
    button: 0,
    clientX: 500,
    clientY: 400,
    currentTarget,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    ...overrides,
  }
}

describe('useResizable', () => {
  let onSizeChange
  let onPositionChange

  beforeEach(() => {
    onSizeChange = vi.fn()
    onPositionChange = vi.fn()
  })

  const renderResizable = (windowRef, minimized = false, maximized = false) => renderHook(() =>
    useResizable(windowRef, minimized, maximized, onSizeChange, onPositionChange)
  )

  it('captures the pointer and persists an east resize', () => {
    const windowRef = makeWindowRef()
    const { result } = renderResizable(windowRef)
    const down = makePointerEvent({ clientY: 250 })

    act(() => result.current.handlePointerDown(down, 'e'))
    expect(down.currentTarget.setPointerCapture).toHaveBeenCalledWith(7)
    expect(windowRef.current.classList.add).toHaveBeenCalledWith('resizing')

    act(() => result.current.handlePointerMove({ pointerId: 7, clientX: 600, clientY: 250 }))
    expect(windowRef.current.style.width).toBe('500px')
    expect(windowRef.current.style.height).toBe('300px')

    act(() => result.current.handlePointerUp({ pointerId: 7 }))
    expect(onSizeChange).toHaveBeenCalledWith({ width: 500, height: 300 })
    expect(down.currentTarget.releasePointerCapture).toHaveBeenCalledWith(7)
    expect(windowRef.current.classList.remove).toHaveBeenCalledWith('resizing')
  })

  it('ignores moves and releases from a different pointer', () => {
    const windowRef = makeWindowRef()
    const { result } = renderResizable(windowRef)
    const down = makePointerEvent()

    act(() => result.current.handlePointerDown(down, 'se'))
    act(() => result.current.handlePointerMove({ pointerId: 8, clientX: 600, clientY: 500 }))
    act(() => result.current.handlePointerUp({ pointerId: 8 }))

    expect(windowRef.current.style.width).toBeUndefined()
    expect(onSizeChange).not.toHaveBeenCalled()
  })

  it('updates position when resizing from west', () => {
    const windowRef = makeWindowRef()
    const { result } = renderResizable(windowRef)
    const down = makePointerEvent({ clientX: 100, clientY: 250 })

    act(() => result.current.handlePointerDown(down, 'w'))
    act(() => result.current.handlePointerMove({ pointerId: 7, clientX: 50, clientY: 250 }))
    act(() => result.current.handlePointerUp({ pointerId: 7 }))

    expect(onSizeChange).toHaveBeenCalledWith({ width: 450, height: 300 })
    expect(onPositionChange).toHaveBeenCalledWith({ x: 50, y: 100 })
  })

  it('enforces minimum dimensions', () => {
    const windowRef = makeWindowRef()
    const { result } = renderResizable(windowRef)
    const down = makePointerEvent()

    act(() => result.current.handlePointerDown(down, 'se'))
    act(() => result.current.handlePointerMove({ pointerId: 7, clientX: 0, clientY: 0 }))
    act(() => result.current.handlePointerUp({ pointerId: 7 }))

    expect(onSizeChange).toHaveBeenCalledWith({ width: 200, height: 150 })
  })

  it.each([
    ['minimized', true, false],
    ['maximized', false, true],
  ])('does not start while %s', (_label, minimized, maximized) => {
    const windowRef = makeWindowRef()
    const { result } = renderResizable(windowRef, minimized, maximized)
    const down = makePointerEvent()

    act(() => result.current.handlePointerDown(down, 'e'))

    expect(down.currentTarget.setPointerCapture).not.toHaveBeenCalled()
    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('keeps keyboard resizing available', () => {
    const windowRef = makeWindowRef()
    const { result } = renderResizable(windowRef)
    const event = {
      key: 'ArrowRight',
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    act(() => result.current.handleKeyboardResize(event, 'e'))

    expect(onSizeChange).toHaveBeenCalledWith({ width: 410, height: 300 })
  })

  it('removes the resizing class on unmount', () => {
    const windowRef = makeWindowRef()
    const { result, unmount } = renderResizable(windowRef)
    act(() => result.current.handlePointerDown(makePointerEvent(), 'e'))

    unmount()

    expect(windowRef.current.classList.remove).toHaveBeenCalledWith('resizing')
  })
})
