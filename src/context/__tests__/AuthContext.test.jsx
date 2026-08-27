import { render, screen, waitFor, act } from '@testing-library/react'
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

  it('concurrent 401s trigger only one refresh request', async () => {
    sessionStorage.setItem('accessToken', makeTestToken(Math.floor(Date.now() / 1000) - 1))
    sessionStorage.setItem('refreshToken', makeTestToken())

    let refreshCallCount = 0
    const newToken = makeTestToken()

    global.fetch = vi.fn(async (url) => {
      if (url.includes('/auth/refresh')) {
        refreshCallCount++
        await new Promise(r => setTimeout(r, 10)) // simulate network delay
        return {
          ok: true,
          json: () => Promise.resolve({ access_token: newToken, refresh_token: makeTestToken() }),
        }
      }
      return { ok: true, json: () => Promise.resolve({}) }
    })

    const TestConcurrent = () => {
      const { authenticatedFetch, isAuthenticated, loading } = useAuth()
      return (
        <div>
          <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
          <span data-testid="loading">{loading ? 'yes' : 'no'}</span>
          <button onClick={() => {
            Promise.all([
              authenticatedFetch('/api/test1').catch(() => {}),
              authenticatedFetch('/api/test2').catch(() => {}),
              authenticatedFetch('/api/test3').catch(() => {}),
            ])
          }}>Trigger</button>
        </div>
      )
    }

    const user = userEvent.setup()
    render(<AuthProvider><TestConcurrent /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('no'))

    await act(async () => {
      await user.click(screen.getByText('Trigger'))
      await new Promise(r => setTimeout(r, 50))
    })

    expect(refreshCallCount).toBe(1)
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

  // --- Regresión P1-2 (auditoría externa 2026-08-27) ---
  // Un refresh que termina DESPUÉS del logout no debe resucitar la sesión:
  // ni reescribir sessionStorage ni reinstalar el access token en el estado.

  /** Promesa que el test decide cuándo resolver, para retener una respuesta. */
  const makeDeferred = () => {
    let resolve
    const promise = new Promise(r => { resolve = r })
    return { promise, resolve }
  }

  /** Consumidor que expone el valor vivo del contexto al test. */
  const makeCapture = (bag) => {
    const Capture = () => {
      bag.current = useAuth()
      return null
    }
    return Capture
  }

  const refreshOk = () => ({
    ok: true,
    json: () => Promise.resolve({
      access_token: makeTestToken(),
      refresh_token: makeTestToken(),
    }),
  })

  it('un refresh en vuelo no resucita la sesión tras el logout', async () => {
    sessionStorage.setItem('accessToken', VALID_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

    const refreshGate = makeDeferred()
    let protectedCalls = 0
    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/refresh')) return refreshGate.promise
      if (target.includes('/auth/logout')) return { ok: true, json: async () => ({}) }
      protectedCalls += 1
      // La primera llamada protegida caduca; el reintento tras el refresh iría bien.
      return protectedCalls === 1
        ? { ok: false, status: 401, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    const view = render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))
    expect(bag.current.isAuthenticated).toBe(true)

    // 1-2. Petición protegida → 401 → abre /auth/refresh, cuya respuesta retenemos.
    let pending
    await act(async () => {
      pending = bag.current.authenticatedFetch('/api/v1/protected').catch(() => {})
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(global.fetch.mock.calls.some(c => String(c[0]).includes('/auth/refresh'))).toBe(true)
    })

    // 3. Logout con el refresh todavía en vuelo.
    await act(async () => { bag.current.logout() })
    expect(bag.current.isAuthenticated).toBe(false)
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('refreshToken')).toBeNull()

    // 4. El refresh llega tarde, con credenciales nuevas y válidas.
    await act(async () => {
      refreshGate.resolve(refreshOk())
      await pending
    })

    // 5. La sesión ya estaba cerrada: nada debe volver a sessionStorage.
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('refreshToken')).toBeNull()
    expect(bag.current.token).toBeNull()

    // 6. Remontar el provider no debe recuperar la sesión.
    view.unmount()
    const bag2 = { current: null }
    const Capture2 = makeCapture(bag2)
    render(<AuthProvider><Capture2 /></AuthProvider>)
    await waitFor(() => expect(bag2.current.loading).toBe(false))
    expect(bag2.current.isAuthenticated).toBe(false)
  })

  it('dos refresh que comparten el semáforo tampoco reescriben tras el logout', async () => {
    sessionStorage.setItem('accessToken', VALID_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

    const refreshGate = makeDeferred()
    let refreshCalls = 0
    let protectedCalls = 0
    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/refresh')) {
        refreshCalls += 1
        return refreshGate.promise
      }
      if (target.includes('/auth/logout')) return { ok: true, json: async () => ({}) }
      protectedCalls += 1
      // Las dos primeras (a y b) caducan; sus reintentos tras el refresh irían bien.
      return protectedCalls <= 2
        ? { ok: false, status: 401, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))

    // Dos peticiones protegidas reciben 401 y comparten el mismo refresh.
    let pending
    await act(async () => {
      pending = Promise.all([
        bag.current.authenticatedFetch('/api/v1/a').catch(() => {}),
        bag.current.authenticatedFetch('/api/v1/b').catch(() => {}),
      ])
      await Promise.resolve()
    })
    await waitFor(() => expect(refreshCalls).toBe(1))

    await act(async () => { bag.current.logout() })

    await act(async () => {
      refreshGate.resolve(refreshOk())
      await pending
    })

    expect(refreshCalls).toBe(1)
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('refreshToken')).toBeNull()
    expect(bag.current.isAuthenticated).toBe(false)
    expect(bag.current.token).toBeNull()
  })
})
