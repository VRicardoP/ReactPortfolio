import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useDraggable from '../useDraggable'

const makeWindowRef = (overrides = {}) => ({
  current: {
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 400, height: 300, ...overrides }),
    style: {},
    classList: { add: vi.fn(), remove: vi.fn() },
  },
})

const fireMouseDown = (target, options = {}) => {
  const event = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: 150,
    clientY: 120,
    button: 0,
    ...options,
  })
  // Override target since MouseEvent constructor doesn't support it
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }
  return event
}

describe('useDraggable', () => {
  let onPositionChange
  let onBringToFront

  beforeEach(() => {
    onPositionChange = vi.fn()
    onBringToFront = vi.fn()
    // Set viewport size for clamping tests
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns handleMouseDown function', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    expect(typeof result.current.handleMouseDown).toBe('function')
  })

  it('handleMouseDown ignores right-click (button !== 0)', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    const event = fireMouseDown(document.createElement('div'), { button: 2 })
    act(() => {
      result.current.handleMouseDown(event)
    })

    expect(onBringToFront).not.toHaveBeenCalled()
    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('handleMouseDown ignores when maximized', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, true, onPositionChange, onBringToFront)
    )

    const event = fireMouseDown(document.createElement('div'))
    act(() => {
      result.current.handleMouseDown(event)
    })

    expect(onBringToFront).not.toHaveBeenCalled()
    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('handleMouseDown ignores clicks on control buttons', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    const controlBtn = document.createElement('button')
    controlBtn.classList.add('control-btn')
    const event = fireMouseDown(controlBtn)

    act(() => {
      result.current.handleMouseDown(event)
    })

    expect(onBringToFront).not.toHaveBeenCalled()
    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('handleMouseDown calls onBringToFront', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    const event = fireMouseDown(document.createElement('div'))
    act(() => {
      result.current.handleMouseDown(event)
    })

    expect(onBringToFront).toHaveBeenCalledTimes(1)
  })

  it('handleMouseDown adds dragging class to windowRef.current', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    const event = fireMouseDown(document.createElement('div'))
    act(() => {
      result.current.handleMouseDown(event)
    })

    expect(windowRef.current.classList.add).toHaveBeenCalledWith('dragging')
  })

  it('full drag cycle: mousedown -> mousemove -> mouseup calls onPositionChange with clamped coordinates', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    // mousedown at (150, 120), window starts at (100, 100)
    const event = fireMouseDown(document.createElement('div'), {
      clientX: 150,
      clientY: 120,
    })
    act(() => {
      result.current.handleMouseDown(event)
    })

    // mousemove to (200, 170) => delta (50, 50) => new pos (150, 150)
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 200, clientY: 170 })
      )
    })

    expect(windowRef.current.style.left).toBe('150px')
    expect(windowRef.current.style.top).toBe('150px')

    // mouseup
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onPositionChange).toHaveBeenCalledWith({ x: 150, y: 150 })
  })

  it('drag clamps position to viewport boundaries (cannot go off screen)', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    // mousedown at (150, 120), window starts at (100, 100)
    const event = fireMouseDown(document.createElement('div'), {
      clientX: 150,
      clientY: 120,
    })
    act(() => {
      result.current.handleMouseDown(event)
    })

    // Move far to the right and below viewport
    // maxX = 1024 - 200 = 824, maxY = 768 - 100 = 668
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 2000, clientY: 2000 })
      )
    })

    expect(windowRef.current.style.left).toBe('824px')
    expect(windowRef.current.style.top).toBe('668px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onPositionChange).toHaveBeenCalledWith({ x: 824, y: 668 })
  })

  it('drag clamps position to minimum (0, 0)', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    const event = fireMouseDown(document.createElement('div'), {
      clientX: 150,
      clientY: 120,
    })
    act(() => {
      result.current.handleMouseDown(event)
    })

    // Move far to the top-left (negative)
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: -1000, clientY: -1000 })
      )
    })

    expect(windowRef.current.style.left).toBe('0px')
    expect(windowRef.current.style.top).toBe('0px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onPositionChange).toHaveBeenCalledWith({ x: 0, y: 0 })
  })

  it('mouseup removes dragging class', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    const event = fireMouseDown(document.createElement('div'))
    act(() => {
      result.current.handleMouseDown(event)
    })

    // Move to generate finalX/finalY
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 200, clientY: 170 })
      )
    })

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(windowRef.current.classList.remove).toHaveBeenCalledWith('dragging')
  })

  it('cleanup removes event listeners on unmount', () => {
    const windowRef = makeWindowRef()
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange, onBringToFront)
    )

    unmount()

    const removedEvents = removeEventListenerSpy.mock.calls.map((c) => c[0])
    expect(removedEvents).toContain('mousemove')
    expect(removedEvents).toContain('mouseup')

    removeEventListenerSpy.mockRestore()
  })
})
