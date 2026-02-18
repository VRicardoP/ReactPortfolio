import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../AuthContext'

const TestConsumer = () => {
  const { isAuthenticated, loading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="loading">{loading ? 'yes' : 'no'}</span>
      <button onClick={() => login('admin', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })

  it('starts unauthenticated', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no')
    })
    expect(screen.getByTestId('auth')).toHaveTextContent('no')
  })

  it('restores token from localStorage', async () => {
    localStorage.setItem('accessToken', 'stored-token')
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no')
    })
    expect(screen.getByTestId('auth')).toHaveTextContent('yes')
  })

  it('logs in successfully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ access_token: 'new-token', token_type: 'bearer' }),
    })

    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no')
    })

    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('yes')
    })
    expect(localStorage.getItem('accessToken')).toBe('new-token')
  })

  it('handles login failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Invalid credentials' }),
    })

    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no')
    })

    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('no')
    })
  })

  it('logs out and clears storage', async () => {
    localStorage.setItem('accessToken', 'stored-token')
    localStorage.setItem('tokenType', 'bearer')

    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('yes')
    })

    await user.click(screen.getByText('Logout'))

    expect(screen.getByTestId('auth')).toHaveTextContent('no')
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
