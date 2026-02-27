import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WindowProvider, useWindowContext } from '../WindowContext'

// Mock the Toast module to avoid side effects
vi.mock('../../components/UI/Toast', () => ({
  showToast: vi.fn(),
}))

// Test consumer component that exposes context values and actions
const TestConsumer = ({ onContext }) => {
  const context = useWindowContext()
  // Expose context to test via callback ref pattern
  onContext(context)
  return (
    <div>
      <span data-testid="active">{context.activeWindowId || 'none'}</span>
      <span data-testid="windows">{JSON.stringify(context.windows)}</span>
    </div>
  )
}

describe('WindowContext', () => {
  let contextRef

  const renderWithProvider = () => {
    contextRef = {}
    const captureContext = (ctx) => { contextRef.current = ctx }
    render(
      <WindowProvider>
        <TestConsumer onContext={captureContext} />
      </WindowProvider>
    )
    return contextRef
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registerWindow adds a window to state', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('test-window', {
        position: { x: 200, y: 150 },
        size: { width: 500, height: 400 },
      })
    })

    const windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['test-window']).toBeDefined()
    expect(windows['test-window'].position).toEqual({ x: 200, y: 150 })
    expect(windows['test-window'].size).toEqual({ width: 500, height: 400 })
    expect(windows['test-window'].isMinimized).toBe(false)
    expect(windows['test-window'].isMaximized).toBe(false)
  })

  it('unregisterWindow removes a window', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-a')
      contextRef.current.registerWindow('win-b')
    })

    let windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-a']).toBeDefined()
    expect(windows['win-b']).toBeDefined()

    act(() => {
      contextRef.current.unregisterWindow('win-a')
    })

    windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-a']).toBeUndefined()
    expect(windows['win-b']).toBeDefined()
  })

  it('bringToFront updates z-index and active window', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-a', { zIndex: 100 })
      contextRef.current.registerWindow('win-b', { zIndex: 100 })
    })

    // Bring win-b to front first so it gets a higher z-index
    act(() => {
      contextRef.current.bringToFront('win-b')
    })

    let windows = JSON.parse(screen.getByTestId('windows').textContent)
    const winBz = windows['win-b'].zIndex
    expect(winBz).toBeGreaterThan(windows['win-a'].zIndex)

    // Now bring win-a to front — it should surpass win-b
    act(() => {
      contextRef.current.bringToFront('win-a')
    })

    windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-a'].zIndex).toBeGreaterThan(winBz)
    expect(screen.getByTestId('active').textContent).toBe('win-a')
  })

  it('minimizeWindow sets isMinimized to true', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-min', { isMinimized: false })
    })

    act(() => {
      contextRef.current.toggleMinimize('win-min')
    })

    const windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-min'].isMinimized).toBe(true)
  })

  it('maximizeWindow toggles maximize state', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-max', { isMaximized: false })
    })

    // First toggle: maximize
    act(() => {
      contextRef.current.toggleMaximize('win-max')
    })

    let windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-max'].isMaximized).toBe(true)

    // Second toggle: restore
    act(() => {
      contextRef.current.toggleMaximize('win-max')
    })

    windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-max'].isMaximized).toBe(false)
  })

  it('setWindowPosition updates position', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-pos', {
        position: { x: 100, y: 100 },
      })
    })

    act(() => {
      contextRef.current.updatePosition('win-pos', { x: 300, y: 250 })
    })

    const windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-pos'].position).toEqual({ x: 300, y: 250 })
  })

  it('setWindowSize updates size', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-size', {
        size: { width: 400, height: 300 },
      })
    })

    act(() => {
      contextRef.current.updateSize('win-size', { width: 600, height: 500 })
    })

    const windows = JSON.parse(screen.getByTestId('windows').textContent)
    expect(windows['win-size'].size).toEqual({ width: 600, height: 500 })
  })

  it('getNextZIndex returns incremented z-index value', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-z1', { zIndex: 100 })
    })

    act(() => {
      contextRef.current.bringToFront('win-z1')
    })

    const windows1 = JSON.parse(screen.getByTestId('windows').textContent)
    const firstZ = windows1['win-z1'].zIndex

    act(() => {
      contextRef.current.registerWindow('win-z2', { zIndex: 100 })
    })

    act(() => {
      contextRef.current.bringToFront('win-z2')
    })

    const windows2 = JSON.parse(screen.getByTestId('windows').textContent)
    const secondZ = windows2['win-z2'].zIndex

    // Each bringToFront should increment the z-index
    expect(secondZ).toBeGreaterThan(firstZ)
  })

  it('activeWindowId updates on bring to front', () => {
    renderWithProvider()

    act(() => {
      contextRef.current.registerWindow('win-x')
      contextRef.current.registerWindow('win-y')
    })

    expect(screen.getByTestId('active').textContent).toBe('none')

    act(() => {
      contextRef.current.bringToFront('win-x')
    })

    expect(screen.getByTestId('active').textContent).toBe('win-x')

    act(() => {
      contextRef.current.bringToFront('win-y')
    })

    expect(screen.getByTestId('active').textContent).toBe('win-y')
  })
})
