import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useWindowLayout from '../useWindowLayout'

// Module-level mocks that tests can mutate
const mockToggleMinimize = vi.fn()
const mockUpdatePosition = vi.fn()
// Use a container so we can swap the windows object reference
const mockState = { windows: {} }

vi.mock('../../context/WindowContext', () => ({
  useWindowContext: () => ({
    windows: mockState.windows,
    toggleMinimize: mockToggleMinimize,
    updatePosition: mockUpdatePosition,
  }),
}))

vi.mock('../../components/UI/Toast', () => ({
  showToast: vi.fn(),
}))

vi.mock('../../i18n', () => ({
  default: { t: (key) => key },
}))

describe('useWindowLayout', () => {
  const windowIds = ['win-1', 'win-2', 'win-3']

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockState.windows = {}
    // Set a desktop viewport
    Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not animate if windows are not registered', () => {
    // mockWindows is empty — allRegistered check will fail
    renderHook(() => useWindowLayout(windowIds, 1000))

    // Advance well past the delay
    act(() => { vi.advanceTimersByTime(5000) })

    expect(mockUpdatePosition).not.toHaveBeenCalled()
    expect(mockToggleMinimize).not.toHaveBeenCalled()
  })

  it('calls updatePosition for each window during grid positioning', () => {
    windowIds.forEach(id => { mockState.windows[id] = { isMinimized: false } })

    renderHook(() => useWindowLayout(windowIds, 500))

    // Advance past the initial delay to trigger animateWindows
    act(() => { vi.advanceTimersByTime(600) })

    // Grid positioning: updatePosition called once per window immediately
    expect(mockUpdatePosition).toHaveBeenCalledTimes(windowIds.length)
    windowIds.forEach(id => {
      expect(mockUpdatePosition).toHaveBeenCalledWith(id, expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }))
    })
  })

  it('calls toggleMinimize for each window during animation sequence', () => {
    windowIds.forEach(id => { mockState.windows[id] = { isMinimized: false } })

    renderHook(() => useWindowLayout(windowIds, 500))

    // Advance past all timers: delay + base + stagger * (n-1) + inner delay
    // delay=500, base=300, stagger=60*2=120, inner=200
    // Total: 500 + 300 + 120 + 200 = 1120
    act(() => { vi.advanceTimersByTime(2000) })

    expect(mockToggleMinimize).toHaveBeenCalledTimes(windowIds.length)
    windowIds.forEach(id => {
      expect(mockToggleMinimize).toHaveBeenCalledWith(id)
    })
  })

  it('advances through the staggered animation with fake timers', () => {
    windowIds.forEach(id => { mockState.windows[id] = { isMinimized: false } })

    renderHook(() => useWindowLayout(windowIds, 500))

    // Before delay fires, nothing should happen
    act(() => { vi.advanceTimersByTime(499) })
    expect(mockUpdatePosition).not.toHaveBeenCalled()

    // Trigger the initial delay — grid positioning fires
    act(() => { vi.advanceTimersByTime(1) })
    expect(mockUpdatePosition).toHaveBeenCalledTimes(3)

    // First window outer timer (300ms base + 0*60 stagger = 300ms)
    // fires updatePosition for pill positioning
    act(() => { vi.advanceTimersByTime(300) })
    // 3 grid + 1 pill = 4 calls
    expect(mockUpdatePosition).toHaveBeenCalledTimes(4)

    // Inner timer for first window (200ms) fires toggleMinimize
    act(() => { vi.advanceTimersByTime(200) })
    expect(mockToggleMinimize).toHaveBeenCalledTimes(1)
  })

  it('does not re-animate if already animated (hasAnimated ref guard)', () => {
    windowIds.forEach(id => { mockState.windows[id] = { isMinimized: false } })

    const { rerender } = renderHook(() => useWindowLayout(windowIds, 500))

    // Complete the full animation
    act(() => { vi.advanceTimersByTime(2000) })

    const callCountPosition = mockUpdatePosition.mock.calls.length
    const callCountMinimize = mockToggleMinimize.mock.calls.length

    // Trigger a re-render — the hook should not re-animate
    rerender()
    act(() => { vi.advanceTimersByTime(2000) })

    expect(mockUpdatePosition.mock.calls.length).toBe(callCountPosition)
    expect(mockToggleMinimize.mock.calls.length).toBe(callCountMinimize)
  })

  it('cleans up timers on unmount', () => {
    windowIds.forEach(id => { mockState.windows[id] = { isMinimized: false } })

    const { unmount } = renderHook(() => useWindowLayout(windowIds, 500))

    // Start the delay but unmount before it fires
    act(() => { vi.advanceTimersByTime(200) })
    unmount()

    // Advancing past the delay should not trigger any calls
    act(() => { vi.advanceTimersByTime(5000) })

    expect(mockUpdatePosition).not.toHaveBeenCalled()
    expect(mockToggleMinimize).not.toHaveBeenCalled()
  })

  it('begins animation only after all windows are registered', () => {
    // Start with only 2 of 3 windows registered
    mockState.windows = { 'win-1': { isMinimized: false }, 'win-2': { isMinimized: false } }

    const { rerender } = renderHook(() => useWindowLayout(windowIds, 500))

    act(() => { vi.advanceTimersByTime(1000) })
    expect(mockUpdatePosition).not.toHaveBeenCalled()

    // Register the third window — assign a new object so React sees a different reference
    mockState.windows = {
      'win-1': { isMinimized: false },
      'win-2': { isMinimized: false },
      'win-3': { isMinimized: false },
    }
    rerender()

    // Now advance past the delay
    act(() => { vi.advanceTimersByTime(600) })
    expect(mockUpdatePosition).toHaveBeenCalled()
  })

  it('shows toast after last window is minimized', async () => {
    const { showToast } = await import('../../components/UI/Toast')
    windowIds.forEach(id => { mockState.windows[id] = { isMinimized: false } })

    renderHook(() => useWindowLayout(windowIds, 500))

    // Complete the full animation sequence
    act(() => { vi.advanceTimersByTime(2000) })

    expect(showToast).toHaveBeenCalledWith('toast.exploreWindows', 3000)
  })
})
