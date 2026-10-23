// Controla si el usuario ha iniciado sesión en el panel de administración:
// guarda ese estado, ofrece las funciones de entrar y salir, y protege las
// llamadas al servidor para que se desconecten solas si la sesión caduca.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { BACKEND_URL, DEFAULT_HEADERS } from '../config/api';
import useInactivityLogout from '../hooks/useInactivityLogout';
import { authenticatedRequest, SETTLED } from '../services/authFetch';
import { safeSession } from '../utils/safeStorage';

const AuthContext = createContext();

// Borra tokens de una versión antigua de la app que guardaba la sesión en el
// navegador en vez de en una cookie segura.
const clearLegacyTokens = () => {
    safeSession.remove('accessToken');
    safeSession.remove('refreshToken');
    safeSession.remove('tokenType');
};

// Da acceso, desde cualquier componente, a si el usuario ha iniciado sesión
// y a las funciones para entrar/salir.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

// Envuelve toda la aplicación y se encarga de la sesión: quién ha entrado,
// cómo renovarla automáticamente, y cómo cerrarla.
export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const refreshPromiseRef = useRef(null);
    const logoutPromiseRef = useRef(null);
    const loginControllerRef = useRef(null);
    const authEpochRef = useRef(0);
    const loginAttemptRef = useRef(0);

    // Marca el inicio de una sesión nueva (login o logout), para que las
    // respuestas de peticiones antiguas que lleguen tarde se puedan descartar.
    const openSession = useCallback(() => {
        refreshPromiseRef.current = null;
        authEpochRef.current += 1;
        return authEpochRef.current;
    }, []);

    // Aplica el resultado de una comprobación de sesión, pero solo si nadie
    // ha abierto una sesión más nueva mientras tanto (si no, se descarta).
    const settleSession = useCallback((epoch, authenticated) => {
        if (authEpochRef.current !== epoch) return SETTLED.STALE;
        setIsAuthenticated(authenticated);
        return authenticated ? SETTLED.COMMITTED : SETTLED.FAILED;
    }, []);

    // Intenta renovar la sesión sin pedir la contraseña; si ya hay una
    // renovación en marcha, se apunta a esa misma en vez de duplicarla.
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

    // Al cargar la aplicación, comprueba si ya hay una sesión activa (y si no,
    // intenta renovarla antes de rendirse).
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

    // Procesa el intento de inicio de sesión: envía usuario y contraseña, y si
    // son correctos, marca la sesión como iniciada.
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

    // Cierra la sesión: la marca como cerrada de inmediato en la pantalla, y
    // en segundo plano avisa al servidor para que invalide el token.
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

    useInactivityLogout(isAuthenticated, logout);

    // Hace una petición al servidor añadiendo las credenciales de sesión, y si
    // el servidor dice que la sesión caducó, intenta renovarla y reintenta una
    // vez; si tampoco funciona, cierra la sesión.
    const authenticatedFetch = useCallback(async (url, options = {}) => {
        if (!isAuthenticated) throw new Error('No authenticated session');
        const epoch = authEpochRef.current;
        return authenticatedRequest(url, options, {
            epoch,
            currentEpoch: () => authEpochRef.current,
            tryRefresh,
            logout,
        });
    }, [isAuthenticated, logout, tryRefresh]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, authenticatedFetch }}>
            {children}
        </AuthContext.Provider>
    );
};
