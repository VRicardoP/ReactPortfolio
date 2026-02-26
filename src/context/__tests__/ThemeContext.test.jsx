import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider, useTheme } from '../ThemeContext'

// Helper component that exposes theme state and actions
const ThemeConsumer = () => {
  const {
    theme,
    themeName,
    cycleTheme,
    backgroundEffect,
    cycleBackground,
  } = useTheme()
  return (
    <div>
      <span data-testid="theme-name">{themeName}</span>
      <span data-testid="primary">{theme.primary}</span>
      <span data-testid="background-effect">{backgroundEffect}</span>
      <button onClick={cycleTheme}>Cycle Theme</button>
      <button onClick={cycleBackground}>Cycle Background</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset CSS custom properties
    document.documentElement.style.cssText = ''
  })

  it('provides default theme (cyan)', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-name')).toHaveTextContent('cyan')
    expect(screen.getByTestId('primary')).toHaveTextContent('#00ffff')
  })

  it('cycles through themes (cyan -> silver -> amber -> cyan)', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-name')).toHaveTextContent('cyan')

    await user.click(screen.getByText('Cycle Theme'))
    expect(screen.getByTestId('theme-name')).toHaveTextContent('silver')

    await user.click(screen.getByText('Cycle Theme'))
    expect(screen.getByTestId('theme-name')).toHaveTextContent('amber')

    await user.click(screen.getByText('Cycle Theme'))
    expect(screen.getByTestId('theme-name')).toHaveTextContent('cyan')
  })

  it('cycles through background effects', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    // Default is 'rain'
    expect(screen.getByTestId('background-effect')).toHaveTextContent('rain')

    await user.click(screen.getByText('Cycle Background'))
    expect(screen.getByTestId('background-effect')).toHaveTextContent('parallax')

    await user.click(screen.getByText('Cycle Background'))
    expect(screen.getByTestId('background-effect')).toHaveTextContent('matrix')

    await user.click(screen.getByText('Cycle Background'))
    expect(screen.getByTestId('background-effect')).toHaveTextContent('lensflare')

    await user.click(screen.getByText('Cycle Background'))
    expect(screen.getByTestId('background-effect')).toHaveTextContent('cube')

    await user.click(screen.getByText('Cycle Background'))
    expect(screen.getByTestId('background-effect')).toHaveTextContent('smoke')

    // Wraps back to rain
    await user.click(screen.getByText('Cycle Background'))
    expect(screen.getByTestId('background-effect')).toHaveTextContent('rain')
  })

  it('persists theme to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByText('Cycle Theme'))

    expect(localStorage.getItem('portfolio-theme')).toBe('silver')
  })

  it('persists background to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByText('Cycle Background'))

    expect(localStorage.getItem('portfolio-background')).toBe('parallax')
  })

  it('restores theme from localStorage', () => {
    localStorage.setItem('portfolio-theme', 'amber')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-name')).toHaveTextContent('amber')
    expect(screen.getByTestId('primary')).toHaveTextContent('#d4a574')
  })

  it('injects CSS variables on the document root', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    const root = document.documentElement
    expect(root.style.getPropertyValue('--theme-primary')).toBe('#00ffff')
    expect(root.style.getPropertyValue('--theme-primary-rgb')).toBe('0, 255, 255')
    expect(root.style.getPropertyValue('--theme-secondary')).toBe('#D3D3D3')
    expect(root.style.getPropertyValue('--theme-text')).toBe('#D3D3D3')
    expect(root.style.getPropertyValue('--theme-text-highlight')).toBe('#00ffff')
  })
})
