import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { BACKEND_URL, DEFAULT_HEADERS } from '../config/api';

const AuthContext = createContext();

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
const SETTLED = Object.freeze({ COMMITTED: 'committed', FAILED: 'failed', STALE: 'stale' });
const clearLegacyTokens = () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('tokenType');
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const refreshPromiseRef = useRef(null);
    const logoutPromiseRef = useRef(null);
    const loginControllerRef = useRef(null);
    const authEpochRef = useRef(0);
    const loginAttemptRef = useRef(0);
    const inactivityTimerRef = useRef(null);

    const openSession = useCallback(() => {
        refreshPromiseRef.current = null;
        authEpochRef.current += 1;
        return authEpochRef.current;
    }, []);

    const settleSession = useCallback((epoch, authenticated) => {
        if (authEpochRef.current !== epoch) return SETTLED.STALE;
        setIsAuthenticated(authenticated);
        return authenticated ? SETTLED.COMMITTED : SETTLED.FAILED;
    }, []);

    const tryRefresh = useCallback(async () => {
        const epoch = authEpochRef.current;
        if (refreshPromiseRef.current) return refreshPromiseRef.current;

        const refresh = (async () => {
            let authenticated = false;
            try {
                const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...DEFAULT_HEADERS },
                    credentials: 'include',
                });
                authenticated = response.ok;
            } catch {
                authenticated = false;
            }
            return settleSession(epoch, authenticated);
        })();

        const flight = refresh.finally(() => {
            if (refreshPromiseRef.current === flight) refreshPromiseRef.current = null;
        });
        refreshPromiseRef.current = flight;
        return flight;
    }, [settleSession]);

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            clearLegacyTokens();
            const epoch = authEpochRef.current;
            let authenticated = false;
            try {
                const response = await fetch(`${BACKEND_URL}/api/v1/auth/users/me`, {
                    headers: DEFAULT_HEADERS,
                    credentials: 'include',
                });
                if (response.ok) authenticated = true;
                else if (response.status === 401) {
                    authenticated = (await tryRefresh()) === SETTLED.COMMITTED;
                }
            } catch {
                authenticated = false;
            }
            if (authenticated) settleSession(epoch, true);
            else if (authEpochRef.current === epoch) setIsAuthenticated(false);
            if (mounted) setLoading(false);
        };
        init();
        return () => { mounted = false; };
    }, [settleSession, tryRefresh]);

    const login = useCallback(async (username, password) => {
        const attempt = ++loginAttemptRef.current;
        const epochBefore = authEpochRef.current;
        loginControllerRef.current?.abort();
        const controller = new AbortController();
        loginControllerRef.current = controller;

        try {
            if (logoutPromiseRef.current) await logoutPromiseRef.current;
            const formData = new URLSearchParams({ username, password });
            const response = await fetch(`${BACKEND_URL}/api/v1/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    ...DEFAULT_HEADERS,
                },
                body: formData.toString(),
                credentials: 'include',
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Authentication failed');
            }
            if (attempt !== loginAttemptRef.current || authEpochRef.current !== epochBefore) {
                return { success: false, error: 'Session superseded' };
            }
            settleSession(openSession(), true);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.name === 'AbortError'
                    ? 'Session superseded'
                    : error.message || 'Authentication failed',
            };
        } finally {
            if (loginControllerRef.current === controller) loginControllerRef.current = null;
        }
    }, [openSession, settleSession]);

    const logout = useCallback(() => {
        clearLegacyTokens();
        loginControllerRef.current?.abort();
        const epoch = openSession();
        settleSession(epoch, false);
        const request = fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            credentials: 'include',
        }).catch(() => {});
        const flight = request.finally(() => {
            if (logoutPromiseRef.current === flight) logoutPromiseRef.current = null;
        });
        logoutPromiseRef.current = flight;
        return flight;
    }, [openSession, settleSession]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const resetTimer = () => {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = setTimeout(() => {
                sessionStorage.setItem('logoutReason', 'inactivity');
                void logout();
            }, INACTIVITY_TIMEOUT_MS);
        };
        resetTimer();
        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, resetTimer, { passive: true });
        }
        return () => {
            clearTimeout(inactivityTimerRef.current);
            for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, resetTimer);
        };
    }, [isAuthenticated, logout]);

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!isAuthenticated) throw new Error('No authenticated session');
        const epoch = authEpochRef.current;
        const headers = { ...DEFAULT_HEADERS, ...options.headers };
        if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

        let response = await fetch(url, { ...options, headers, credentials: 'include' });
        if (response.status === 401) {
            const outcome = await tryRefresh();
            if (outcome === SETTLED.STALE || authEpochRef.current !== epoch) {
                throw new Error('Session expired');
            }
            if (outcome === SETTLED.FAILED) {
                throw new Error('Session expired');
            }
            response = await fetch(url, { ...options, headers, credentials: 'include' });
            if (response.status === 401) {
                if (authEpochRef.current === epoch) void logout();
                throw new Error('Session expired');
            }
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw Object.assign(new Error(error.detail || 'Request failed'), { status: response.status });
        }
        return response;
    }, [isAuthenticated, logout, tryRefresh]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, authenticatedFetch }}>
            {children}
        </AuthContext.Provider>
    );
};
