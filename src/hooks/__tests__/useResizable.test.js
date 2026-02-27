import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

const fireResizeStart = (clientX = 500, clientY = 400) => ({
  clientX,
  clientY,
  stopPropagation: vi.fn(),
  preventDefault: vi.fn(),
})

describe('useResizable', () => {
  let onSizeChange
  let onPositionChange

  beforeEach(() => {
    onSizeChange = vi.fn()
    onPositionChange = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns handleResizeStart function', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    expect(typeof result.current.handleResizeStart).toBe('function')
  })

  it('handleResizeStart ignores when minimized', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, true, false, onSizeChange, onPositionChange)
    )

    const event = fireResizeStart()
    act(() => {
      result.current.handleResizeStart(event, 'e')
    })

    expect(event.stopPropagation).not.toHaveBeenCalled()
    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('handleResizeStart ignores when maximized', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, true, onSizeChange, onPositionChange)
    )

    const event = fireResizeStart()
    act(() => {
      result.current.handleResizeStart(event, 's')
    })

    expect(event.stopPropagation).not.toHaveBeenCalled()
    expect(windowRef.current.classList.add).not.toHaveBeenCalled()
  })

  it('east resize increases width', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    // Start resize from east edge at (500, 250)
    const event = fireResizeStart(500, 250)
    act(() => {
      result.current.handleResizeStart(event, 'e')
    })

    // Move mouse 100px to the right
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 600, clientY: 250 })
      )
    })

    // width should be 400 + 100 = 500
    expect(windowRef.current.style.width).toBe('500px')
    // height should remain 300
    expect(windowRef.current.style.height).toBe('300px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onSizeChange).toHaveBeenCalledWith({ width: 500, height: 300 })
  })

  it('south resize increases height', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    const event = fireResizeStart(300, 400)
    act(() => {
      result.current.handleResizeStart(event, 's')
    })

    // Move mouse 80px down
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 300, clientY: 480 })
      )
    })

    // height should be 300 + 80 = 380
    expect(windowRef.current.style.height).toBe('380px')
    // width should remain 400
    expect(windowRef.current.style.width).toBe('400px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onSizeChange).toHaveBeenCalledWith({ width: 400, height: 380 })
  })

  it('west resize decreases width and adjusts x position', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    // Start resize from west edge at (100, 250)
    const event = fireResizeStart(100, 250)
    act(() => {
      result.current.handleResizeStart(event, 'w')
    })

    // Move mouse 50px to the left => delta = (50 - 100) = -50
    // proposedWidth = 400 - (-50) = 450, newX = 100 + (-50) = 50
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 50, clientY: 250 })
      )
    })

    expect(windowRef.current.style.width).toBe('450px')
    expect(windowRef.current.style.left).toBe('50px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onSizeChange).toHaveBeenCalledWith({ width: 450, height: 300 })
    expect(onPositionChange).toHaveBeenCalledWith({ x: 50, y: 100 })
  })

  it('north resize decreases height and adjusts y position', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    // Start resize from north edge at (300, 100)
    const event = fireResizeStart(300, 100)
    act(() => {
      result.current.handleResizeStart(event, 'n')
    })

    // Move mouse 60px up => delta = (40 - 100) = -60
    // proposedHeight = 300 - (-60) = 360, newY = 100 + (-60) = 40
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 300, clientY: 40 })
      )
    })

    expect(windowRef.current.style.height).toBe('360px')
    expect(windowRef.current.style.top).toBe('40px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onSizeChange).toHaveBeenCalledWith({ width: 400, height: 360 })
    expect(onPositionChange).toHaveBeenCalledWith({ x: 100, y: 40 })
  })

  it('enforces minimum width (200px)', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    const event = fireResizeStart(500, 250)
    act(() => {
      result.current.handleResizeStart(event, 'e')
    })

    // Move mouse 300px to the left => delta = -300
    // newWidth = max(400 + (-300), 200) = max(100, 200) = 200
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 200, clientY: 250 })
      )
    })

    expect(windowRef.current.style.width).toBe('200px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onSizeChange).toHaveBeenCalledWith({ width: 200, height: 300 })
  })

  it('enforces minimum height (150px)', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    const event = fireResizeStart(300, 400)
    act(() => {
      result.current.handleResizeStart(event, 's')
    })

    // Move mouse 250px up => delta = -250
    // newHeight = max(300 + (-250), 150) = max(50, 150) = 150
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 300, clientY: 150 })
      )
    })

    expect(windowRef.current.style.height).toBe('150px')

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onSizeChange).toHaveBeenCalledWith({ width: 400, height: 150 })
  })

  it('mouseup calls onSizeChange with final dimensions', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    const event = fireResizeStart(500, 400)
    act(() => {
      result.current.handleResizeStart(event, 'se')
    })

    // Resize southeast: move 50 right, 30 down
    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 550, clientY: 430 })
      )
    })

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onSizeChange).toHaveBeenCalledWith({ width: 450, height: 330 })
    // Position should not change for se resize
    expect(onPositionChange).not.toHaveBeenCalled()
  })

  it('adds and removes resizing class', () => {
    const windowRef = makeWindowRef()
    const { result } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    const event = fireResizeStart(500, 250)
    act(() => {
      result.current.handleResizeStart(event, 'e')
    })

    expect(windowRef.current.classList.add).toHaveBeenCalledWith('resizing')

    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 550, clientY: 250 })
      )
    })

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(windowRef.current.classList.remove).toHaveBeenCalledWith('resizing')
  })

  it('cleanup removes event listeners on unmount', () => {
    const windowRef = makeWindowRef()
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() =>
      useResizable(windowRef, false, false, onSizeChange, onPositionChange)
    )

    unmount()

    const removedEvents = removeEventListenerSpy.mock.calls.map((c) => c[0])
    expect(removedEvents).toContain('mousemove')
    expect(removedEvents).toContain('mouseup')

    removeEventListenerSpy.mockRestore()
  })
})
