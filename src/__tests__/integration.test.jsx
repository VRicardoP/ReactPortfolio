import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import ProtectedRoute from '../components/ProtectedRoute'
import LoginPage from '../pages/LoginPage'

// Mock BackgroundEffect to avoid Three.js issues in jsdom
vi.mock('../components/Background/BackgroundEffect', () => ({
  default: () => null,
}))

// Mock dashboard-heavy hooks to avoid complex data fetching
vi.mock('../hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    stats: { total_visitors: 10, unique_countries: 3, unique_cities: 5 },
    mapData: [],
    chatAnalytics: {},
    jobData: {},
    loading: false,
    error: null,
  }),
}))

vi.mock('../hooks/useSSENotifications', () => ({
  useSSENotifications: () => {},
}))

vi.mock('../hooks/useWindowLayout', () => ({
  default: () => {},
}))

vi.mock('../hooks/useTypewriter', () => ({
  default: (text) => text,
}))

// Create a valid JWT token with far-future expiration for tests
const makeTestToken = (exp = 4102444800) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ sub: 'admin', exp }))
  return `${header}.${payload}.fake-signature`
}

const VALID_ACCESS_TOKEN = makeTestToken()
const VALID_REFRESH_TOKEN = makeTestToken()

// Helper to render LoginPage inside all required providers
const renderLoginPage = (initialEntries = ['/login']) =>
  render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
            <Route path="/" element={<div data-testid="home-page">Home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  )

describe('Integration: Login flow', () => {
  beforeEach(() => {
    sessionStorage.clear()
    global.fetch = vi.fn()
  })

  it('navigates to /dashboard on successful login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: VALID_ACCESS_TOKEN,
          refresh_token: VALID_REFRESH_TOKEN,
          token_type: 'bearer',
        }),
    })

    const user = userEvent.setup()
    renderLoginPage()

    // Wait for AuthProvider to finish its init loading
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Username'), 'admin')
    await user.type(screen.getByPlaceholderText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    // Tokens should be persisted
    expect(sessionStorage.getItem('accessToken')).toBe(VALID_ACCESS_TOKEN)
    expect(sessionStorage.getItem('refreshToken')).toBe(VALID_REFRESH_TOKEN)
  })

  it('shows error on invalid credentials (401)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Invalid credentials' }),
    })

    const user = userEvent.setup()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Username'), 'wronguser')
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/)).toBeInTheDocument()
    })

    // Should still be on the login page
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(sessionStorage.getItem('accessToken')).toBeNull()
  })

  it('shows validation error when username is empty', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    })

    // Leave username empty, submit
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByText(/Username is required/)).toBeInTheDocument()
    })

    // fetch should NOT have been called (client-side validation)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('shows validation error when password is empty', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Username'), 'admin')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByText(/Password is required/)).toBeInTheDocument()
    })

    // fetch should NOT have been called (client-side validation)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('Integration: ProtectedRoute', () => {
  beforeEach(() => {
    sessionStorage.clear()
    global.fetch = vi.fn()
  })

  it('redirects unauthenticated user to /login', async () => {
    renderProtectedRoute()

    await waitFor(() => {
      expect(screen.getByTestId('login-marker')).toBeInTheDocument()
    })

    // Dashboard content should NOT be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('allows authenticated user to access protected content', async () => {
    // Set valid tokens before rendering so AuthProvider picks them up
    sessionStorage.setItem('accessToken', VALID_ACCESS_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_REFRESH_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

    renderProtectedRoute()

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('login-marker')).not.toBeInTheDocument()
  })
})

describe('Integration: Logout flow', () => {
  beforeEach(() => {
    sessionStorage.clear()
    global.fetch = vi.fn()
  })

  it('clears tokens and redirects to /login on logout', async () => {
    // Start as authenticated
    sessionStorage.setItem('accessToken', VALID_ACCESS_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_REFRESH_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <LogoutTestPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    )

    // Wait for authenticated content to render
    await waitFor(() => {
      expect(screen.getByTestId('logout-button')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('logout-button'))

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    // Tokens should be cleared
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('refreshToken')).toBeNull()
    expect(sessionStorage.getItem('tokenType')).toBeNull()
  })
})

describe('Integration: Inactivity timeout', () => {
  beforeEach(() => {
    sessionStorage.clear()
    global.fetch = vi.fn()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('logs out after 15 minutes of inactivity and redirects to login', async () => {
    sessionStorage.setItem('accessToken', VALID_ACCESS_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_REFRESH_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div data-testid="protected-content">Dashboard</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    )

    // Should be authenticated initially
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    // Advance 15 minutes (inactivity timeout)
    vi.advanceTimersByTime(15 * 60 * 1000)

    await waitFor(() => {
      expect(screen.getByTestId('login-redirect')).toBeInTheDocument()
    })

    // Session should be cleared and reason set
    expect(sessionStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('logoutReason')).toBe('inactivity')
  })

  it('resets inactivity timer on user interaction', async () => {
    sessionStorage.setItem('accessToken', VALID_ACCESS_TOKEN)
    sessionStorage.setItem('refreshToken', VALID_REFRESH_TOKEN)
    sessionStorage.setItem('tokenType', 'bearer')

    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div data-testid="protected-content">Dashboard</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div data-testid="login-redirect">Login</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    // Advance 14 minutes (just before timeout)
    vi.advanceTimersByTime(14 * 60 * 1000)

    // User interacts — simulate a click to reset the timer
    window.dispatchEvent(new Event('click'))

    // Advance another 14 minutes — should still be within the NEW 15-min window
    vi.advanceTimersByTime(14 * 60 * 1000)

    // Should still be authenticated (14 min after the reset, not 15)
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()

    // Now advance 2 more minutes (total 16 min since last activity) — should expire
    vi.advanceTimersByTime(2 * 60 * 1000)

    await waitFor(() => {
      expect(screen.getByTestId('login-redirect')).toBeInTheDocument()
    })
  })

  it('shows inactivity message on login page after timeout', async () => {
    // Simulate that AuthContext set the reason before redirect
    sessionStorage.setItem('logoutReason', 'inactivity')

    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByText('Session expired due to inactivity')).toBeInTheDocument()
    })

    // The reason should be cleared after display
    expect(sessionStorage.getItem('logoutReason')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

// A minimal page with a logout button that uses AuthContext
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function LogoutTestPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <span data-testid="dashboard-content">Dashboard Content</span>
      <button data-testid="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}

// Helper to render ProtectedRoute with routing
function renderProtectedRoute() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div data-testid="protected-content">Protected Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-marker">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
