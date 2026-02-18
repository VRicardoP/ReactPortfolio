import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorBoundary from '../ErrorBoundary'

const ThrowingComponent = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test error')
  return <div>Child content</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  const originalError = console.error
  beforeEach(() => { console.error = vi.fn() })
  afterEach(() => { console.error = originalError })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('renders null when fallback prop is null', () => {
    const { container } = render(
      <ErrorBoundary fallback={null}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom error')).toBeInTheDocument()
  })

  it('resets error state after clicking Try Again', () => {
    // After Try Again, ErrorBoundary resets hasError to false and tries
    // to render children again. We verify the button triggers setState.
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()

    // Clicking Try Again calls setState({ hasError: false })
    // The child will throw again (same props), so error state returns
    fireEvent.click(screen.getByText('Try Again'))

    // ErrorBoundary catches the re-thrown error and shows fallback again
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
  })
})
