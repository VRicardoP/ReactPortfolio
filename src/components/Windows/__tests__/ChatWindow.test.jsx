import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChatWindow from '../ChatWindow'

// Mock FloatingWindow to simplify rendering
vi.mock('../FloatingWindow', () => ({
  default: ({ children, title }) => (
    <div data-testid="floating-window" data-title={title}>
      {children}
    </div>
  ),
}))

describe('ChatWindow', () => {
  const mockData = { name: 'Vicente' }
  const mockPosition = { x: 100, y: 100 }

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('renders with welcome message', () => {
    render(<ChatWindow data={mockData} initialPosition={mockPosition} />)
    expect(screen.getByText(/Hi there! I'm Kusanagi/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument()
  })

  it('renders send button disabled when input is empty', () => {
    render(<ChatWindow data={mockData} initialPosition={mockPosition} />)
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when input has text', () => {
    render(<ChatWindow data={mockData} initialPosition={mockPosition} />)
    const input = screen.getByPlaceholderText('Ask me anything...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    const sendButton = screen.getByText('Send')
    expect(sendButton).not.toBeDisabled()
  })

  it('sends message and shows bot response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: 'Test bot reply' }),
    })

    render(<ChatWindow data={mockData} initialPosition={mockPosition} />)
    const input = screen.getByPlaceholderText('Ask me anything...')

    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('Test question')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Test bot reply')).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    render(<ChatWindow data={mockData} initialPosition={mockPosition} />)
    const input = screen.getByPlaceholderText('Ask me anything...')

    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      // Error appears both as a bot message and as an error banner
      const errors = screen.getAllByText(/Sorry, I encountered an error/)
      expect(errors.length).toBeGreaterThanOrEqual(1)
    })
  })
})
