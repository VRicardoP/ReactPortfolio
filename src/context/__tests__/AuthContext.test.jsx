import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../AuthContext'

// Create a valid JWT token with far-future expiration for tests
const makeTestToken = (exp = 4102444800) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ sub: 'admin', exp }))
  return `${header}.${payload}.fake-signature`
}

const VALID_TOKEN = makeTestToken()

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
    sessionStorage.clear()
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

  it('restores token from sessionStorage', async () => {
    sessionStorage.setItem('accessToken', VALID_TOKEN)
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

  it('does not restore malformed token from sessionStorage', async () => {
    sessionStorage.setItem('accessToken', 'not-a-jwt')
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no')
    })
    expect(screen.getByTestId('auth')).toHaveTextContent('no')
    expect(sessionStorage.getItem('accessToken')).toBeNull()
  })

  it('does not restore token without exp claim', async () => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ sub: 'admin' }))
    sessionStorage.setItem('accessToken', `${header}.${payload}.fake-signature`)
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('no')
    })
    expect(screen.getByTestId('auth')).toHaveTextContent('no')
    expect(sessionStorage.getItem('accessToken')).toBeNull()
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
    expect(sessionStorage.getItem('accessToken')).toBe('new-token')
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
    sessionStorage.setItem('accessToken', VALID_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

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
    expect(sessionStorage.getItem('accessToken')).toBeNull()
  })
})
