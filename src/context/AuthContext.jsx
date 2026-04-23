import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

import { BACKEND_URL } from '../config/api';

const AuthContext = createContext();

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

const isTokenExpired = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
        const payload = JSON.parse(atob(padded));
        if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return true;
        return payload.exp * 1000 <= Date.now();
    } catch {
        return true; // If we can't decode, assume expired (safer than assuming valid)
    }
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    // Semaphore: if a refresh is already in flight, all callers share the same promise.
    // Prevents 12 parallel dashboard fetches from consuming the refresh token simultaneously.
    const refreshPromiseRef = useRef(null);

    // try to get a new access token using the refresh token
    const tryRefresh = useCallback(async () => {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (!refreshToken || isTokenExpired(refreshToken)) {
            return null;
        }

        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        const doRefresh = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                });
                if (!response.ok) return null;
                const data = await response.json();
                sessionStorage.setItem('accessToken', data.access_token);
                sessionStorage.setItem('refreshToken', data.refresh_token);
                return data.access_token;
            } catch {
                return null;
            } finally {
                refreshPromiseRef.current = null;
            }
        };

        refreshPromiseRef.current = doRefresh();
        return refreshPromiseRef.current;
    }, []);

    // when the page loads check if there's already a saved token
    useEffect(() => {
        const init = async () => {
            const storedToken = sessionStorage.getItem('accessToken');
            if (storedToken && !isTokenExpired(storedToken)) {
                setToken(storedToken);
                setIsAuthenticated(true);
            } else {
                // access token expired or missing, try refresh
                const newToken = await tryRefresh();
                if (newToken) {
                    setToken(newToken);
                    setIsAuthenticated(true);
                } else {
                    sessionStorage.removeItem('accessToken');
                    sessionStorage.removeItem('refreshToken');
                    sessionStorage.removeItem('tokenType');
                }
            }
            setLoading(false);
        };
        init();
    }, [tryRefresh]);

    // function to log in
    const login = useCallback(async (username, password) => {
        try {
            // prepare the data to send to the server
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${BACKEND_URL}/api/v1/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Authentication failed');
            }

            const data = await response.json();

            // save tokens so we don't have to log in again
            sessionStorage.setItem('accessToken', data.access_token);
            sessionStorage.setItem('refreshToken', data.refresh_token);
            sessionStorage.setItem('tokenType', data.token_type);

            setToken(data.access_token);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }, []);

    // log out and clear everything — fire-and-forget token revocation to keep logout synchronous
    const logout = useCallback(() => {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (refreshToken) {
            fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${refreshToken}` },
                credentials: 'include',
            })?.catch(() => {});
        }
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('tokenType');
        setToken(null);
        setIsAuthenticated(false);
    }, []);

    // Proactive session expiry check — refresh or logout before the user hits a 401
    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

        const intervalId = setInterval(async () => {
            const storedToken = sessionStorage.getItem('accessToken');
            if (!storedToken || isTokenExpired(storedToken)) {
                const newToken = await tryRefresh();
                if (newToken) {
                    setToken(newToken);
                } else {
                    logout();
                }
            }
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [isAuthenticated, token, tryRefresh, logout]);

    // Inactivity timeout — logout after 15 minutes of no user interaction
    const inactivityTimerRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const resetTimer = () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            inactivityTimerRef.current = setTimeout(() => {
                sessionStorage.setItem('logoutReason', 'inactivity');
                logout();
            }, INACTIVITY_TIMEOUT_MS);
        };

        // Start the timer immediately
        resetTimer();

        // Reset on any user activity
        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, resetTimer, { passive: true });
        }

        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            for (const event of ACTIVITY_EVENTS) {
                window.removeEventListener(event, resetTimer);
            }
        };
    }, [isAuthenticated, logout]);

    // to make requests to the server with the token
    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!token) {
            throw new Error('No authentication token');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        let response = await fetch(url, { ...options, headers, credentials: 'include' });

        // if 401, try refreshing the token before giving up
        if (response.status === 401) {
            const newToken = await tryRefresh();
            if (newToken) {
                setToken(newToken);
                const retryHeaders = {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json',
                };
                response = await fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
            }
            if (!newToken || response.status === 401) {
                logout();
                throw new Error('Session expired');
            }
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Request failed');
        }

        return response;
    }, [token, logout, tryRefresh]);

    const value = {
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        authenticatedFetch
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
