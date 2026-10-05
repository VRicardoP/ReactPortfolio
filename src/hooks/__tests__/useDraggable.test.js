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

const makeCaptureTarget = () => {
  let capturedPointerId = null
  return {
    setPointerCapture: vi.fn((pointerId) => { capturedPointerId = pointerId }),
    hasPointerCapture: vi.fn((pointerId) => capturedPointerId === pointerId),
    releasePointerCapture: vi.fn(() => { capturedPointerId = null }),
  }
}

const makePointerEvent = (options = {}) => {
  const target = options.target || document.createElement('div')
  return {
    button: 0,
    pointerId: 7,
    clientX: 150,
    clientY: 120,
    currentTarget: options.currentTarget || makeCaptureTarget(),
    preventDefault: vi.fn(),
    ...options,
    target,
  }
}

describe('useDraggable', () => {
  let onPositionChange
  let animationFrames
  let nextFrameId

  beforeEach(() => {
    onPositionChange = vi.fn()
    animationFrames = new Map()
    nextFrameId = 1
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      const id = nextFrameId++
      animationFrames.set(id, callback)
      return id
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => animationFrames.delete(id)))
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const flushFrame = () => {
    const [id, callback] = animationFrames.entries().next().value
    animationFrames.delete(id)
    callback(16)
  }

  it('returns the complete Pointer Events contract', () => {
    const { result } = renderHook(() =>
      useDraggable(makeWindowRef(), false, false, onPositionChange)
    )

    expect(result.current).toEqual({
      handlePointerDown: expect.any(Function),
      handlePointerMove: expect.any(Function),
      handlePointerUp: expect.any(Function),
      handlePointerCancel: expect.any(Function),
      handleLostPointerCapture: expect.any(Function),
    })
  })

  it.each([
    ['right click', false, { button: 2 }],
    ['maximized window', true, {}],
  ])('ignores %s', (_label, isMaximized, eventOptions) => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, isMaximized, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent(eventOptions)))

    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('ignores window control buttons', () => {
    const windowRef = makeWindowRef()
    const control = document.createElement('span')
    control.className = 'control-btn'
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent({ target: control })))

    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('captures the pointer and marks the window as dragging', () => {
    const windowRef = makeWindowRef()
    const captureTarget = makeCaptureTarget()
    const event = makePointerEvent({ currentTarget: captureTarget })
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(event))

    expect(captureTarget.setPointerCapture).toHaveBeenCalledWith(7)
    expect(windowRef.current.classList.add).toHaveBeenCalledWith('dragging')
    expect(windowRef.current.style.willChange).toBe('transform')
    expect(windowRef.current.style.backdropFilter).toBe('none')
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('coalesces pointer movements into one transform per animation frame', () => {
    const windowRef = makeWindowRef()
    const captureTarget = makeCaptureTarget()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent({ currentTarget: captureTarget })))
    act(() => {
      result.current.handlePointerMove(makePointerEvent({ pointerId: 7, clientX: 175, clientY: 140 }))
      result.current.handlePointerMove(makePointerEvent({ pointerId: 7, clientX: 200, clientY: 170 }))
    })

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(windowRef.current.style.left).toBeUndefined()
    expect(windowRef.current.style.top).toBeUndefined()

    act(flushFrame)
    expect(windowRef.current.style.transform).toBe('translate3d(50px, 50px, 0)')
  })

  it('commits the final absolute position and clears the transform on pointerup', () => {
    const windowRef = makeWindowRef()
    const captureTarget = makeCaptureTarget()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent({ currentTarget: captureTarget })))
    act(() => result.current.handlePointerMove(makePointerEvent({ clientX: 200, clientY: 170 })))
    act(flushFrame)
    act(() => result.current.handlePointerUp(makePointerEvent({ currentTarget: captureTarget })))

    expect(windowRef.current.style.left).toBe('150px')
    expect(windowRef.current.style.top).toBe('150px')
    expect(windowRef.current.style.transform).toBe('')
    expect(windowRef.current.style.willChange).toBe('')
    expect(windowRef.current.style.backdropFilter).toBe('')
    expect(windowRef.current.classList.remove).toHaveBeenCalledWith('dragging')
    expect(captureTarget.releasePointerCapture).toHaveBeenCalledWith(7)
    expect(onPositionChange).toHaveBeenCalledWith({ x: 150, y: 150 })
  })

  it.each([
    [2000, 2000, 824, 668],
    [-1000, -1000, 0, 0],
  ])('clamps (%s, %s) to (%s, %s)', (clientX, clientY, expectedX, expectedY) => {
    const windowRef = makeWindowRef()
    const captureTarget = makeCaptureTarget()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent({ currentTarget: captureTarget })))
    act(() => result.current.handlePointerMove(makePointerEvent({ clientX, clientY })))
    act(() => result.current.handlePointerUp(makePointerEvent({ currentTarget: captureTarget })))

    expect(windowRef.current.style.left).toBe(`${expectedX}px`)
    expect(windowRef.current.style.top).toBe(`${expectedY}px`)
    expect(onPositionChange).toHaveBeenCalledWith({ x: expectedX, y: expectedY })
  })

  it('ignores events from a different pointer', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent()))
    act(() => result.current.handlePointerMove(makePointerEvent({ pointerId: 99, clientX: 200 })))
    act(() => result.current.handlePointerUp(makePointerEvent({ pointerId: 99 })))

    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(onPositionChange).not.toHaveBeenCalled()
  })

  it.each(['handlePointerCancel', 'handleLostPointerCapture'])('%s safely finishes the drag', (handler) => {
    const windowRef = makeWindowRef()
    const captureTarget = makeCaptureTarget()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent({ currentTarget: captureTarget })))
    act(() => result.current.handlePointerMove(makePointerEvent({ clientX: 180, clientY: 150 })))
    act(() => result.current[handler](makePointerEvent({ currentTarget: captureTarget })))

    expect(windowRef.current.style.left).toBe('130px')
    expect(windowRef.current.style.top).toBe('130px')
    expect(onPositionChange).toHaveBeenCalledWith({ x: 130, y: 130 })
  })

  it('does not persist a stale position when there was no movement', () => {
    const windowRef = makeWindowRef()
    const captureTarget = makeCaptureTarget()
    const { result } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent({ currentTarget: captureTarget })))
    act(() => result.current.handlePointerUp(makePointerEvent({ currentTarget: captureTarget })))

    expect(onPositionChange).not.toHaveBeenCalled()
  })

  it('cancels a pending frame and clears drag styles on unmount', () => {
    const windowRef = makeWindowRef()
    const { result, unmount } = renderHook(() =>
      useDraggable(windowRef, false, false, onPositionChange)
    )

    act(() => result.current.handlePointerDown(makePointerEvent()))
    act(() => result.current.handlePointerMove(makePointerEvent({ clientX: 200, clientY: 170 })))
    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
    expect(windowRef.current.classList.remove).toHaveBeenCalledWith('dragging')
    expect(windowRef.current.style.transform).toBe('')
    expect(windowRef.current.style.willChange).toBe('')
    expect(windowRef.current.style.backdropFilter).toBe('')
  })
})

/* DT-137: contrato anterior conservado como referencia. Estas llamadas se
   comentan porque el hook activo ya no registra listeners globales ni escribe
   posición en cada evento; las pruebas superiores validan captura y rAF.

const { handleMouseDown } = useDraggable(
  windowRef, false, false, onPositionChange, onBringToFront
)
handleMouseDown(new MouseEvent('mousedown'))
document.dispatchEvent(new MouseEvent('mousemove'))
document.dispatchEvent(new MouseEvent('mouseup'))
expect(removedEvents).toContain('mousemove')
expect(removedEvents).toContain('mouseup')
*/
