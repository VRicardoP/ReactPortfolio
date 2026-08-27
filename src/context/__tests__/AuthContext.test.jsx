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

  // --- Regresión P1-1 y P2-1 (auditoría G9 2026-08-27) ---
  // La frontera de credenciales tiene CUATRO caminos (init, login, tryRefresh y
  // el reintento de authenticatedFetch). Todos deben obedecer la misma regla de
  // epoch, y "la operación caducó" no puede confundirse con "la operación
  // fracasó": esa confusión es la que borraba el almacén de una sesión ajena.

  const makeSubToken = (sub, exp = 4102444800) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ sub, exp }))
    return `${header}.${payload}.fake-signature`
  }
  const subOf = (jwt) => JSON.parse(atob(jwt.split('.')[1])).sub
  const ALREADY_EXPIRED = 1000000000

  it('A4 · el refresh de arranque no borra las credenciales de un login que triunfó entretanto', async () => {
    // Pestaña reabierta: access caducado, refresh todavía vivo. El formulario de
    // /login se renderiza igualmente (no está dentro de ProtectedRoute).
    sessionStorage.setItem('accessToken', makeSubToken('OLD', ALREADY_EXPIRED))
    sessionStorage.setItem('refreshToken', makeSubToken('OLD'))
    sessionStorage.setItem('tokenType', 'bearer')

    const refreshGate = makeDeferred()
    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/refresh')) return refreshGate.promise
      if (target.includes('/auth/token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: makeSubToken('NEW'),
            refresh_token: makeSubToken('NEW'),
            token_type: 'bearer',
          }),
        }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(
      global.fetch.mock.calls.some(c => String(c[0]).includes('/auth/refresh'))
    ).toBe(true))
    expect(bag.current.loading).toBe(true)

    // El usuario entra por el formulario mientras el refresh de arranque vuela.
    await act(async () => {
      const outcome = await bag.current.login('admin', 'password')
      expect(outcome.success).toBe(true)
    })
    expect(subOf(sessionStorage.getItem('accessToken'))).toBe('NEW')

    // Ahora responde el refresh de arranque: 200 válido, pero de la sesión VIEJA.
    await act(async () => {
      refreshGate.resolve({
        ok: true,
        json: async () => ({ access_token: makeSubToken('OLD'), refresh_token: makeSubToken('OLD') }),
      })
      await Promise.resolve()
    })
    await waitFor(() => expect(bag.current.loading).toBe(false))

    // El arranque caducó; no puede limpiar el almacén de la sesión que lo relevó.
    expect(sessionStorage.getItem('accessToken')).not.toBeNull()
    expect(sessionStorage.getItem('refreshToken')).not.toBeNull()
    expect(subOf(sessionStorage.getItem('accessToken'))).toBe('NEW')
    expect(bag.current.isAuthenticated).toBe(true)
    expect(subOf(bag.current.token)).toBe('NEW')
  })

  it('A1 · un login en vuelo no instala credenciales después del logout', async () => {
    const loginGate = makeDeferred()
    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/token')) return loginGate.promise
      return { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))

    let pending
    await act(async () => {
      pending = bag.current.login('admin', 'password')
      await Promise.resolve()
    })
    await act(async () => { bag.current.logout() })
    expect(sessionStorage.getItem('accessToken')).toBeNull()

    await act(async () => {
      loginGate.resolve({
        ok: true,
        json: async () => ({
          access_token: makeSubToken('LATE'),
          refresh_token: makeSubToken('LATE'),
          token_type: 'bearer',
        }),
      })
      await pending
    })

    // El logout es la última palabra: la revocación ya salió con el refresh
    // ANTERIOR, así que una credencial nueva que sobreviva no se revoca nunca.
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('refreshToken')).toBeNull()
    expect(sessionStorage.getItem('tokenType')).toBeNull()
    expect(bag.current.isAuthenticated).toBe(false)
    expect(bag.current.token).toBeNull()
  })

  it('A2 · dos logins concurrentes: se queda la sesión que el usuario pidió último', async () => {
    const gateAlice = makeDeferred()
    const gateBob = makeDeferred()
    let loginCalls = 0
    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/token')) {
        loginCalls += 1
        return loginCalls === 1 ? gateAlice.promise : gateBob.promise
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))

    let pAlice, pBob
    await act(async () => { pAlice = bag.current.login('alice', 'pw'); await Promise.resolve() })
    await act(async () => { pBob = bag.current.login('bob', 'pw'); await Promise.resolve() })

    // BOB (el último que pidió el usuario) responde primero; ALICE llega tarde.
    await act(async () => {
      gateBob.resolve({
        ok: true,
        json: async () => ({ access_token: makeSubToken('BOB'), refresh_token: makeSubToken('BOB'), token_type: 'bearer' }),
      })
      await pBob
    })
    await act(async () => {
      gateAlice.resolve({
        ok: true,
        json: async () => ({ access_token: makeSubToken('ALICE'), refresh_token: makeSubToken('ALICE'), token_type: 'bearer' }),
      })
      await pAlice
    })

    expect(subOf(sessionStorage.getItem('accessToken'))).toBe('BOB')
    expect(subOf(bag.current.token)).toBe('BOB')
  })

  it('A3 · el semáforo de refresh no se hereda: una promesa huérfana no cierra la sesión nueva', async () => {
    sessionStorage.setItem('accessToken', VALID_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_TOKEN)

    const orphanGate = makeDeferred()
    const REFRESHED = makeSubToken('NEW2')
    let refreshCalls = 0
    global.fetch = vi.fn(async (url, options) => {
      const target = String(url)
      if (target.includes('/auth/refresh')) {
        refreshCalls += 1
        // El refresh de la sesión NUEVA sí responde; el de la vieja lo retenemos.
        if (refreshCalls === 1) return orphanGate.promise
        return {
          ok: true,
          json: async () => ({ access_token: REFRESHED, refresh_token: makeSubToken('NEW2') }),
        }
      }
      if (target.includes('/auth/logout')) return { ok: true, json: async () => ({}) }
      if (target.includes('/auth/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: makeSubToken('NEW'), refresh_token: makeSubToken('NEW'), token_type: 'bearer' }),
        }
      }
      // Solo el access token recién refrescado sirve: así el reintento de la
      // sesión nueva llega a buen puerto y el único cierre posible sería el
      // provocado por la promesa huérfana.
      const authorized = String(options?.headers?.Authorization || '').includes(REFRESHED)
      if (authorized) return { ok: true, status: 200, json: async () => ({}) }
      return { ok: false, status: 401, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))

    // 1. Sesión vieja: petición protegida → 401 → refresh RETENIDO.
    let pOld
    await act(async () => {
      pOld = bag.current.authenticatedFetch('/api/v1/x').catch(() => {})
      await Promise.resolve()
    })
    await waitFor(() => expect(refreshCalls).toBe(1))

    // 2-3. logout con el refresh en vuelo, y login nuevo con éxito.
    await act(async () => { bag.current.logout() })
    await act(async () => { await bag.current.login('admin', 'password') })
    expect(subOf(sessionStorage.getItem('accessToken'))).toBe('NEW')

    // 4. La sesión NUEVA pide su propio refresh: el semáforo debe estar libre.
    let pNew
    await act(async () => {
      pNew = bag.current.authenticatedFetch('/api/v1/y').catch(() => {})
      await Promise.resolve()
    })
    await waitFor(() => expect(refreshCalls).toBe(2))

    // 5. Resuelve la promesa huérfana de la sesión vieja.
    await act(async () => {
      orphanGate.resolve({
        ok: true,
        json: async () => ({ access_token: makeSubToken('OLD'), refresh_token: makeSubToken('OLD') }),
      })
      await pOld
      await pNew
    })

    expect(bag.current.isAuthenticated).toBe(true)
    expect(sessionStorage.getItem('accessToken')).not.toBeNull()
    expect(subOf(sessionStorage.getItem('accessToken'))).not.toBe('OLD')
  })

  // --- Regresión G10-6 y G10-7 (auditoría G10 2026-08-27) ---

  const credenciales = (sub, conRefresh = true) => ({
    ok: true,
    json: async () => ({
      access_token: makeSubToken(sub),
      ...(conRefresh ? { refresh_token: makeSubToken(sub) } : {}),
      token_type: 'bearer',
    }),
  })

  // G10-6: el servidor omite `refresh_token` del body cuando
  // `AUTH_REFRESH_TOKEN_IN_BODY=False` (canal canónico: cookie HttpOnly). El
  // guardado condicional dejaba vivo el refresh de la identidad ANTERIOR, así
  // que al caducar el access la pestaña volvía en silencio a esa sesión.
  it('G10-A · un login sin refresh_token en el body no hereda el de la identidad anterior', async () => {
    let loginCalls = 0
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/auth/token')) {
        loginCalls += 1
        return loginCalls === 1 ? credenciales('ALICE') : credenciales('BOB', false)
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))

    await act(async () => { await bag.current.login('alice', 'pw') })
    expect(subOf(sessionStorage.getItem('refreshToken'))).toBe('ALICE')

    await act(async () => { await bag.current.login('bob', 'pw') })
    expect(subOf(sessionStorage.getItem('accessToken'))).toBe('BOB')

    const guardado = sessionStorage.getItem('refreshToken')
    expect(guardado && subOf(guardado)).toBeNull()
  })

  // G10-7: `login` abría sesión lógica ANTES de enviar las credenciales, así que
  // una contraseña mal tecleada subía el epoch y descartaba como STALE un
  // refresh legítimo en vuelo cuyo par el servidor YA había rotado: el cliente
  // se quedaba con un ancla muerta.
  it('G10-B · un login FALLIDO no descarta el refresh legítimo de la sesión vigente', async () => {
    sessionStorage.setItem('accessToken', makeSubToken('OLD'))
    sessionStorage.setItem('refreshToken', makeSubToken('OLD'))
    sessionStorage.setItem('tokenType', 'bearer')

    const refreshGate = makeDeferred()
    let protectedCalls = 0
    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/refresh')) return refreshGate.promise
      if (target.includes('/auth/logout')) return { ok: true, json: async () => ({}) }
      if (target.includes('/auth/token')) {
        return { ok: false, status: 401, json: async () => ({ detail: 'Invalid credentials' }) }
      }
      protectedCalls += 1
      return protectedCalls === 1
        ? { ok: false, status: 401, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))
    expect(bag.current.isAuthenticated).toBe(true)

    // 1. La sesión vigente pide su refresh (401 en una petición protegida).
    let pending
    await act(async () => {
      pending = bag.current.authenticatedFetch('/api/v1/protegido').catch(() => {})
      await Promise.resolve()
    })
    await waitFor(() => expect(
      global.fetch.mock.calls.some(c => String(c[0]).includes('/auth/refresh'))
    ).toBe(true))

    // 2. El usuario teclea mal la contraseña mientras ese refresh vuela.
    await act(async () => {
      const salida = await bag.current.login('admin', 'mala')
      expect(salida.success).toBe(false)
    })

    // 3. El refresh llega bien: el servidor ya rotó el par, así que descartarlo
    //    deja al cliente con un ancla muerta.
    await act(async () => {
      refreshGate.resolve(credenciales('NEW'))
      await pending
    })

    expect(subOf(sessionStorage.getItem('accessToken'))).toBe('NEW')
    expect(subOf(sessionStorage.getItem('refreshToken'))).toBe('NEW')
    expect(bag.current.isAuthenticated).toBe(true)
  })

  // --- Las secuencias que la frontera ya tenía validadas y G10-7 no puede romper ---

  it('A5 · tres logins concurrentes resolviendo en orden C, A, B: manda C', async () => {
    const gates = [makeDeferred(), makeDeferred(), makeDeferred()]
    let loginCalls = 0
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/auth/token')) return gates[loginCalls++].promise
      return { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))

    let pA, pB, pC
    await act(async () => { pA = bag.current.login('a', 'pw'); await Promise.resolve() })
    await act(async () => { pB = bag.current.login('b', 'pw'); await Promise.resolve() })
    await act(async () => { pC = bag.current.login('c', 'pw'); await Promise.resolve() })

    await act(async () => { gates[2].resolve(credenciales('C')); await pC })
    await act(async () => { gates[0].resolve(credenciales('A')); await pA })
    await act(async () => { gates[1].resolve(credenciales('B')); await pB })

    expect(subOf(sessionStorage.getItem('accessToken'))).toBe('C')
    expect(subOf(bag.current.token)).toBe('C')
  })

  it('A6 · logout con el refresh de ARRANQUE en vuelo deja el almacén vacío', async () => {
    sessionStorage.setItem('accessToken', makeSubToken('OLD', ALREADY_EXPIRED))
    sessionStorage.setItem('refreshToken', makeSubToken('OLD'))
    sessionStorage.setItem('tokenType', 'bearer')

    const refreshGate = makeDeferred()
    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/refresh')) return refreshGate.promise
      if (target.includes('/auth/logout')) return { ok: true, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(
      global.fetch.mock.calls.some(c => String(c[0]).includes('/auth/refresh'))
    ).toBe(true))

    await act(async () => { bag.current.logout() })

    await act(async () => {
      refreshGate.resolve(credenciales('OLD2'))
      await Promise.resolve()
    })
    await waitFor(() => expect(bag.current.loading).toBe(false))

    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('refreshToken')).toBeNull()
    expect(sessionStorage.getItem('tokenType')).toBeNull()
    expect(bag.current.isAuthenticated).toBe(false)
  })

  it('A7 · 401 en petición protegida con un refresh que falla limpia y cierra', async () => {
    sessionStorage.setItem('accessToken', VALID_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

    global.fetch = vi.fn(async (url) => {
      const target = String(url)
      if (target.includes('/auth/logout')) return { ok: true, json: async () => ({}) }
      // El refresh falla igual que la petición protegida: 401.
      return { ok: false, status: 401, json: async () => ({}) }
    })

    const bag = { current: null }
    const Capture = makeCapture(bag)
    render(<AuthProvider><Capture /></AuthProvider>)
    await waitFor(() => expect(bag.current.loading).toBe(false))
    expect(bag.current.isAuthenticated).toBe(true)

    await act(async () => {
      await bag.current.authenticatedFetch('/api/v1/protegido').catch(() => {})
    })

    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('refreshToken')).toBeNull()
    expect(sessionStorage.getItem('tokenType')).toBeNull()
    expect(bag.current.isAuthenticated).toBe(false)
    expect(bag.current.token).toBeNull()
  })
})
