import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

import { BACKEND_URL, DEFAULT_HEADERS } from '../config/api';

const AuthContext = createContext();

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

// ─── FRONTERA DE CREDENCIALES ────────────────────────────────────────────────
//
// REGLA ÚNICA: toda operación captura el epoch de sesión al empezar y solo
// puede escribir o borrar credenciales si al terminar ese epoch sigue siendo el
// vigente; si cambió, la operación CADUCÓ y no toca nada — caducar no es
// fracasar, y solo el fracaso de la sesión vigente limpia el almacén.
//
// Los cuatro caminos que deciden sobre credenciales —el arranque `init`,
// `login`, `tryRefresh` y el reintento de `authenticatedFetch`— liquidan todos
// por `settleSession`, que es el ÚNICO sitio que toca `sessionStorage` y el
// estado de sesión. Nadie escribe por su cuenta: cuatro comprobaciones sueltas
// es exactamente lo que dejó dos caminos sin guarda y convirtió un descarte en
// un borrado.
//
// `openSession` es la otra mitad: abrir o cerrar sesión sube el epoch Y suelta
// el semáforo de refresh, para que una promesa de la sesión anterior no se le
// entregue a la siguiente.
const SETTLED = Object.freeze({
    COMMITTED: 'committed', // credenciales de esta sesión instaladas
    FAILED: 'failed',       // esta sesión, que sigue siendo la vigente, se quedó sin ellas
    STALE: 'stale',         // otra sesión tomó el relevo: no se toca nada
});

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

    // Epoch de sesión: el discriminante de la REGLA ÚNICA (ver arriba).
    const authEpochRef = useRef(0);

    // Orden de los intentos de login. El epoch NO puede llevarlo: desde G10-7
    // un login solo lo consume al liquidar, así que dos intentos concurrentes
    // ven el mismo epoch y el primero en RESOLVER se instalaría, aunque el
    // usuario ya hubiera pedido otro. Este contador reclama el ORDEN al empezar
    // —lo único que un login puede reclamar antes de demostrar nada— sin tocar
    // ninguna credencial ni caducar nada: manda el ÚLTIMO que el usuario pidió.
    const loginAttemptRef = useRef(0);

    /**
     * Abre una sesión lógica nueva (login o logout) y devuelve su epoch.
     * Todo lo que estuviera en vuelo queda caducado, y el semáforo de refresh
     * se suelta para que la sesión nueva pida el suyo en vez de heredar una
     * promesa que no le pertenece.
     */
    const openSession = useCallback(() => {
        refreshPromiseRef.current = null;
        authEpochRef.current += 1;
        return authEpochRef.current;
    }, []);

    /**
     * Liquida una operación contra la frontera de credenciales. ÚNICO punto que
     * escribe o borra credenciales; ver la REGLA ÚNICA en la cabecera.
     *
     * @param {number} epoch  el que capturó la operación al empezar
     * @param {object|null} credentials  las emitidas por el servidor, o null si
     *                                   esta sesión se quedó sin ellas
     * @returns {'committed'|'failed'|'stale'}
     */
    const settleSession = useCallback((epoch, credentials) => {
        if (authEpochRef.current !== epoch) return SETTLED.STALE;

        if (credentials?.access_token) {
            sessionStorage.setItem('accessToken', credentials.access_token);
            // Nunca HEREDAR el refresh anterior: el servidor lo omite del body
            // cuando `AUTH_REFRESH_TOKEN_IN_BODY=False`, y conservarlo dejaba
            // vivo el de la identidad ANTERIOR — al caducar el access, la
            // pestaña volvía en silencio a esa sesión.
            if (credentials.refresh_token) sessionStorage.setItem('refreshToken', credentials.refresh_token);
            else sessionStorage.removeItem('refreshToken');
            if (credentials.token_type) sessionStorage.setItem('tokenType', credentials.token_type);
            setToken(credentials.access_token);
            setIsAuthenticated(true);
            return SETTLED.COMMITTED;
        }

        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('tokenType');
        setToken(null);
        setIsAuthenticated(false);
        return SETTLED.FAILED;
    }, []);

    /**
     * Pide un access token nuevo con el refresh token.
     * @returns {Promise<{outcome: string, token: string|null}>} el desenlace
     * según la frontera; `token` solo viene con `committed`. Devolver el
     * desenlace —y no un token-o-null— es lo que deja distinguir "fracasó" de
     * "caducó" en los tres sitios que llaman.
     */
    const tryRefresh = useCallback(async () => {
        const epoch = authEpochRef.current;
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (!refreshToken || isTokenExpired(refreshToken)) {
            return { outcome: settleSession(epoch, null), token: null };
        }

        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        const doRefresh = async () => {
            let credentials = null;
            try {
                const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${refreshToken}`,
                        'Content-Type': 'application/json',
                        ...DEFAULT_HEADERS,
                    },
                    credentials: 'include',
                });
                if (response.ok) credentials = await response.json();
            } catch {
                credentials = null;
            }
            const outcome = settleSession(epoch, credentials);
            return { outcome, token: outcome === SETTLED.COMMITTED ? credentials.access_token : null };
        };

        // Soltar el semáforo solo si sigue siendo el nuestro: si una sesión
        // nueva lo abrió entretanto, pisarlo la dejaría sin su propio refresh.
        const flight = doRefresh().finally(() => {
            if (refreshPromiseRef.current === flight) refreshPromiseRef.current = null;
        });
        refreshPromiseRef.current = flight;
        return flight;
    }, [settleSession]);

    // when the page loads check if there's already a saved token
    useEffect(() => {
        const init = async () => {
            const epoch = authEpochRef.current;
            const storedToken = sessionStorage.getItem('accessToken');
            if (storedToken && !isTokenExpired(storedToken)) {
                settleSession(epoch, {
                    access_token: storedToken,
                    refresh_token: sessionStorage.getItem('refreshToken'),
                    token_type: sessionStorage.getItem('tokenType'),
                });
            } else {
                // Access token caducado o ausente: el refresh liquida por la
                // frontera. Si CADUCÓ (el formulario de /login —que no está
                // dentro de ProtectedRoute— abrió sesión mientras volaba) no hay
                // nada que limpiar: las credenciales del almacén ya no son las
                // que este arranque estaba evaluando.
                await tryRefresh();
            }
            setLoading(false);
        };
        init();
    }, [tryRefresh, settleSession]);

    // function to log in
    const login = useCallback(async (username, password) => {
        // El epoch se consume al LIQUIDAR, no al empezar: abrir sesión antes de
        // enviar las credenciales hacía que una contraseña mal tecleada
        // descartase como STALE un refresh legítimo en vuelo cuyo par el
        // servidor YA había rotado, dejando al cliente con un ancla muerta.
        const attempt = ++loginAttemptRef.current;
        const epochBefore = authEpochRef.current;
        try {
            // prepare the data to send to the server
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${BACKEND_URL}/api/v1/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    ...DEFAULT_HEADERS,
                },
                body: formData.toString(),
                credentials: 'include',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Authentication failed');
            }

            const data = await response.json();

            if (attempt !== loginAttemptRef.current || authEpochRef.current !== epochBefore) {
                // Un logout, o un login POSTERIOR (aunque todavía no haya
                // resuelto), tomaron el relevo mientras volaba este: sus
                // credenciales mandan. Instalar las nuestras dejaría viva una
                // sesión que el usuario ya no pidió, y cuya revocación en el
                // servidor salió con el refresh token ANTERIOR.
                return { success: false, error: 'Session superseded' };
            }

            // Sesión explícita nueva, ya con las credenciales sobre la mesa:
            // invalida cualquier operación de la anterior.
            settleSession(openSession(), data);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }, [openSession, settleSession]);

    // log out and clear everything — fire-and-forget token revocation to keep logout synchronous
    const logout = useCallback(() => {
        // Leer el refresh token ANTES de abrir sesión nueva: es el que hay que
        // revocar. Abrir sesión invalida lo que esté en vuelo, así que nada de
        // lo anterior podrá resucitar las credenciales que limpiamos aquí.
        const refreshToken = sessionStorage.getItem('refreshToken');
        const epoch = openSession();
        if (refreshToken) {
            fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${refreshToken}`, ...DEFAULT_HEADERS },
                credentials: 'include',
            })?.catch(() => {});
        }
        settleSession(epoch, null);
    }, [openSession, settleSession]);

    // Proactive session expiry check — refresh or logout before the user hits a 401
    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const CHECK_INTERVAL_MS = 60_000; // check every 60 seconds

        const intervalId = setInterval(async () => {
            const storedToken = sessionStorage.getItem('accessToken');
            if (!storedToken || isTokenExpired(storedToken)) {
                // `committed` ya instaló el token por la frontera; `stale` es de
                // otra sesión y no se toca. Solo el fracaso propio cierra.
                const { outcome } = await tryRefresh();
                if (outcome === SETTLED.FAILED) logout();
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

        const epoch = authEpochRef.current;

        const headers = {
            ...DEFAULT_HEADERS,
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        let response = await fetch(url, { ...options, headers, credentials: 'include' });

        // if 401, try refreshing the token before giving up
        if (response.status === 401) {
            const { outcome, token: newToken } = await tryRefresh();
            // Caducó (el refresh, o esta petición): la respuesta ya no es de
            // nuestra sesión. Ni instalar token, ni reintentar, ni cerrar la
            // sesión ajena — que es lo que hacía una promesa huérfana.
            if (outcome === SETTLED.STALE || authEpochRef.current !== epoch) {
                throw new Error('Session expired');
            }
            if (outcome === SETTLED.FAILED) {
                logout();
                throw new Error('Session expired');
            }
            const retryHeaders = {
                ...DEFAULT_HEADERS,
                ...options.headers,
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json',
            };
            response = await fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
            if (response.status === 401) {
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
