import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '../AuthContext';

const reply = (status = 200, data = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

const captureContext = (bag) => {
  const Capture = () => {
    bag.current = useAuth();
    return null;
  };
  return Capture;
};

const renderAuth = async (fetchImpl) => {
  global.fetch = vi.fn(fetchImpl);
  const bag = { current: null };
  const Capture = captureContext(bag);
  render(<AuthProvider><Capture /></AuthProvider>);
  await waitFor(() => expect(bag.current.loading).toBe(false));
  return bag;
};

const endpoint = (url) => String(url);

describe('AuthContext cookie-only session', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('restores a session from the HttpOnly access cookie', async () => {
    const bag = await renderAuth(async (url, options) => {
      expect(endpoint(url)).toContain('/auth/users/me');
      expect(options.credentials).toBe('include');
      return reply(200, { username: 'admin' });
    });
    expect(bag.current.isAuthenticated).toBe(true);
  });

  it('uses the HttpOnly refresh cookie when the access cookie expired', async () => {
    const bag = await renderAuth(async (url, options) => {
      if (endpoint(url).includes('/users/me')) return reply(401);
      expect(endpoint(url)).toContain('/auth/refresh');
      expect(options.credentials).toBe('include');
      expect(options.headers.Authorization).toBeUndefined();
      return reply(200);
    });
    expect(bag.current.isAuthenticated).toBe(true);
  });

  it('starts unauthenticated when neither cookie is valid', async () => {
    const bag = await renderAuth(async () => reply(401));
    expect(bag.current.isAuthenticated).toBe(false);
  });

  it('removes credentials left by the previous sessionStorage implementation', async () => {
    sessionStorage.setItem('accessToken', 'legacy-access');
    sessionStorage.setItem('refreshToken', 'legacy-refresh');
    sessionStorage.setItem('tokenType', 'bearer');
    await renderAuth(async () => reply(401));
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('tokenType')).toBeNull();
  });

  it('logs in without persisting or reading response tokens', async () => {
    const bag = await renderAuth(async (url, options) => {
      if (endpoint(url).includes('/users/me') || endpoint(url).includes('/refresh')) return reply(401);
      expect(options.credentials).toBe('include');
      return reply(200, { access_token: 'must-not-be-stored', refresh_token: 'also-secret' });
    });
    let result;
    await act(async () => { result = await bag.current.login('admin', 'password'); });
    expect(result.success).toBe(true);
    expect(bag.current.isAuthenticated).toBe(true);
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
  });

  it('keeps the current session when a new login attempt fails', async () => {
    const bag = await renderAuth(async (url) => {
      if (endpoint(url).includes('/users/me')) return reply(200);
      return reply(401, { detail: 'Invalid credentials' });
    });
    let result;
    await act(async () => { result = await bag.current.login('admin', 'wrong'); });
    expect(result).toEqual({ success: false, error: 'Invalid credentials' });
    expect(bag.current.isAuthenticated).toBe(true);
  });

  it('sends protected requests with cookies and no Authorization header', async () => {
    const bag = await renderAuth(async (url, options) => {
      if (endpoint(url).includes('/users/me')) return reply(200);
      expect(options.credentials).toBe('include');
      expect(options.headers.Authorization).toBeUndefined();
      return reply(200, { ok: true });
    });
    await act(async () => { await bag.current.authenticatedFetch('/api/protected'); });
  });

  it('shares one refresh across concurrent 401 responses', async () => {
    const gate = deferred();
    let refreshCalls = 0;
    const attempts = new Map();
    const bag = await renderAuth(async (url) => {
      const target = endpoint(url);
      if (target.includes('/users/me')) return reply(200);
      if (target.includes('/auth/refresh')) {
        refreshCalls += 1;
        return gate.promise;
      }
      const count = (attempts.get(target) || 0) + 1;
      attempts.set(target, count);
      return count === 1 ? reply(401) : reply(200);
    });

    let requests;
    await act(async () => {
      requests = Promise.all([
        bag.current.authenticatedFetch('/api/a'),
        bag.current.authenticatedFetch('/api/b'),
        bag.current.authenticatedFetch('/api/c'),
      ]);
      await waitFor(() => expect(refreshCalls).toBe(1));
      gate.resolve(reply(200));
      await requests;
    });
    expect(refreshCalls).toBe(1);
  });

  it('a refresh finishing after logout cannot restore the session', async () => {
    const gate = deferred();
    const bag = await renderAuth(async (url) => {
      const target = endpoint(url);
      if (target.includes('/users/me')) return reply(200);
      if (target.includes('/auth/refresh')) return gate.promise;
      if (target.includes('/auth/logout')) return reply(200);
      return reply(401);
    });

    let request;
    await act(async () => {
      request = bag.current.authenticatedFetch('/api/protected').catch(() => {});
      await waitFor(() => expect(global.fetch.mock.calls.some(([url]) => endpoint(url).includes('/auth/refresh'))).toBe(true));
      await bag.current.logout();
      gate.resolve(reply(200));
      await request;
    });
    expect(bag.current.isAuthenticated).toBe(false);
  });

  it('logout revokes by cookie and clears local state immediately', async () => {
    const gate = deferred();
    const bag = await renderAuth(async (url, options) => {
      if (endpoint(url).includes('/users/me')) return reply(200);
      expect(endpoint(url)).toContain('/auth/logout');
      expect(options.headers.Authorization).toBeUndefined();
      expect(options.credentials).toBe('include');
      return gate.promise;
    });
    let logout;
    await act(async () => { logout = bag.current.logout(); });
    expect(bag.current.isAuthenticated).toBe(false);
    gate.resolve(reply(200));
    await act(async () => { await logout; });
  });

  it('the latest requested login is the only one committed', async () => {
    const first = deferred();
    const second = deferred();
    let loginCalls = 0;
    const bag = await renderAuth(async (url) => {
      const target = endpoint(url);
      if (target.includes('/users/me') || target.includes('/refresh')) return reply(401);
      return (loginCalls++ === 0 ? first : second).promise;
    });

    let oldLogin;
    let newLogin;
    await act(async () => {
      oldLogin = bag.current.login('old', 'password');
      newLogin = bag.current.login('new', 'password');
      first.resolve(reply(200));
      second.resolve(reply(200));
      await Promise.all([oldLogin, newLogin]);
    });
    expect((await oldLogin).success).toBe(false);
    expect((await newLogin).success).toBe(true);
    expect(bag.current.isAuthenticated).toBe(true);
  });

  it('a second 401 after refresh closes only the still-current session', async () => {
    let protectedCalls = 0;
    const bag = await renderAuth(async (url) => {
      const target = endpoint(url);
      if (target.includes('/users/me')) return reply(200);
      if (target.includes('/refresh') || target.includes('/logout')) return reply(200);
      protectedCalls += 1;
      return reply(401);
    });
    await act(async () => {
      await bag.current.authenticatedFetch('/api/protected').catch(() => {});
    });
    expect(protectedCalls).toBe(2);
    expect(bag.current.isAuthenticated).toBe(false);
  });
});
