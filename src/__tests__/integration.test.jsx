import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import ProtectedRoute from '../components/ProtectedRoute';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import LoginPage from '../pages/LoginPage';

vi.mock('../components/Background/BackgroundEffect', () => ({ default: () => null }));
vi.mock('../hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    stats: { total_visitors: 10, unique_countries: 3, unique_cities: 5 },
    mapData: [], chatAnalytics: {}, jobData: {}, loading: false, error: null,
  }),
}));
vi.mock('../hooks/useSSEEvents', () => ({ useSSEEvents: () => ({}) }));
vi.mock('../hooks/useWindowLayout', () => ({ default: () => ({}) }));
vi.mock('../hooks/useTypewriter', () => ({ default: (text) => text }));

const reply = (status = 200, data = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
const target = (url) => String(url);

const unauthenticatedBackend = async (url) => {
  if (target(url).includes('/auth/users/me') || target(url).includes('/auth/refresh')) {
    return reply(401);
  }
  return reply(200);
};

const renderLoginPage = () => render(
  <ThemeProvider>
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  </ThemeProvider>,
);

const renderProtectedRoute = (content = <div data-testid="protected-content">Protected</div>) => render(
  <ThemeProvider>
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute>{content}</ProtectedRoute>} />
          <Route path="/login" element={<div data-testid="login-marker">Login</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  </ThemeProvider>,
);

function LogoutTestPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return <button data-testid="logout-button" onClick={() => { void logout(); navigate('/login'); }}>Logout</button>;
}

describe('authentication integration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn(unauthenticatedBackend);
  });

  afterEach(() => vi.useRealTimers());

  it('navigates to the dashboard after cookie login without storing tokens', async () => {
    global.fetch = vi.fn(async (url) => {
      if (target(url).includes('/auth/token')) {
        return reply(200, { access_token: 'ignored', refresh_token: 'ignored' });
      }
      return unauthenticatedBackend(url);
    });
    const user = userEvent.setup();
    renderLoginPage();
    await user.type(await screen.findByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByTestId('dashboard-page')).toBeInTheDocument();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
  });

  it('shows the backend error for invalid credentials', async () => {
    global.fetch = vi.fn(async (url) => target(url).includes('/auth/token')
      ? reply(401, { detail: 'Invalid credentials' })
      : unauthenticatedBackend(url));
    const user = userEvent.setup();
    renderLoginPage();
    await user.type(await screen.findByPlaceholderText('Username'), 'wrong');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText(/Invalid credentials/)).toBeInTheDocument();
  });

  it('validates a missing username without calling the login endpoint', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await user.click(await screen.findByRole('button', { name: 'Login' }));
    expect(await screen.findByText(/Username is required/)).toBeInTheDocument();
    expect(global.fetch.mock.calls.some(([url]) => target(url).includes('/auth/token'))).toBe(false);
  });

  it('validates a missing password without calling the login endpoint', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await user.type(await screen.findByPlaceholderText('Username'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText(/Password is required/)).toBeInTheDocument();
    expect(global.fetch.mock.calls.some(([url]) => target(url).includes('/auth/token'))).toBe(false);
  });

  it('redirects an unauthenticated user to login', async () => {
    renderProtectedRoute();
    expect(await screen.findByTestId('login-marker')).toBeInTheDocument();
  });

  it('restores protected content from the HttpOnly cookie', async () => {
    global.fetch = vi.fn(async (url) => target(url).includes('/auth/users/me') ? reply(200) : reply(200));
    renderProtectedRoute();
    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
  });

  it('logs out through the cookie endpoint and redirects', async () => {
    global.fetch = vi.fn(async () => reply(200));
    const user = userEvent.setup();
    renderProtectedRoute(<LogoutTestPage />);
    await user.click(await screen.findByTestId('logout-button'));
    expect(await screen.findByTestId('login-marker')).toBeInTheDocument();
    const logout = global.fetch.mock.calls.find(([url]) => target(url).includes('/auth/logout'));
    expect(logout[1]).toEqual(expect.objectContaining({ credentials: 'include' }));
  });

  it('logs out after fifteen minutes of inactivity', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn(async () => reply(200));
    renderProtectedRoute();
    await act(async () => {});
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); });
    expect(screen.getByTestId('login-marker')).toBeInTheDocument();
    expect(sessionStorage.getItem('logoutReason')).toBe('inactivity');
  });

  it('resets the inactivity timeout on interaction', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn(async () => reply(200));
    renderProtectedRoute();
    await act(async () => {});
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
      window.dispatchEvent(new Event('click'));
      await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60 * 1000); });
    expect(screen.getByTestId('login-marker')).toBeInTheDocument();
  });

  it('shows and consumes the inactivity reason on login', async () => {
    sessionStorage.setItem('logoutReason', 'inactivity');
    renderLoginPage();
    expect(await screen.findByText('Session expired due to inactivity')).toBeInTheDocument();
    expect(sessionStorage.getItem('logoutReason')).toBeNull();
  });
});
