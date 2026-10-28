// Transporte del panel: el ÚNICO sitio que sabe contra qué base habla el
// dashboard y qué cabeceras y credenciales lleva cada petición. DT-207: antes
// cada hook construía `${ADMIN_BACKEND_URL}/api/v1/...` por su cuenta, y
// cambiar la base del panel (Tailscale, DT-203) obligó a tocar 17 ficheros.
// Ahora los hooks pasan rutas (`/api/v1/...`) y la base se resuelve aquí.

import { ADMIN_BACKEND_URL, ADMIN_HEADERS } from '../config/api';

export const SETTLED = Object.freeze({
    COMMITTED: 'committed',
    FAILED: 'failed',
    STALE: 'stale',
});

const ABSOLUTA = /^https?:\/\//i;

// Resuelve una ruta del panel contra la base de admin. Una URL ya absoluta
// pasa tal cual, para no obligar a reescribir a quien la traiga resuelta.
export const adminUrl = (pathOrUrl) =>
    ABSOLUTA.test(pathOrUrl) ? pathOrUrl : `${ADMIN_BACKEND_URL}${pathOrUrl}`;

// Petición al panel SIN el ciclo de renovación de sesión: para las rutas de
// auth (que son las que renuevan) y para quien no tiene sesión que renovar.
// Cabeceras de la base (ngrok, DT-129) y cookies siempre incluidas, aquí.
export const adminFetch = (pathOrUrl, options = {}) =>
    fetch(adminUrl(pathOrUrl), {
        ...options,
        headers: { ...ADMIN_HEADERS, ...options.headers },
        credentials: 'include',
    });

// Ejecuta una petición protegida, renueva una vez si la cookie ha caducado y
// evita que una respuesta antigua cierre una sesión más reciente.
export const authenticatedRequest = async (pathOrUrl, options, session) => {
    const headers = { ...ADMIN_HEADERS, ...options.headers };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const request = () => fetch(adminUrl(pathOrUrl), {
        ...options,
        headers,
        credentials: 'include',
    });

    let response = await request();
    if (response.status === 401) {
        const outcome = await session.tryRefresh();
        if (outcome === SETTLED.STALE || session.currentEpoch() !== session.epoch) {
            throw new Error('Session expired');
        }
        if (outcome === SETTLED.FAILED) throw new Error('Session expired');

        response = await request();
        if (response.status === 401) {
            if (session.currentEpoch() === session.epoch) void session.logout();
            throw new Error('Session expired');
        }
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw Object.assign(new Error(error.detail || 'Request failed'), { status: response.status });
    }
    return response;
};
