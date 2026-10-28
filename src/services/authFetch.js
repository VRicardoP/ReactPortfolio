import { ADMIN_HEADERS } from '../config/api';

export const SETTLED = Object.freeze({
    COMMITTED: 'committed',
    FAILED: 'failed',
    STALE: 'stale',
});

// Ejecuta una petición protegida, renueva una vez si la cookie ha caducado y
// evita que una respuesta antigua cierre una sesión más reciente.
export const authenticatedRequest = async (url, options, session) => {
    const headers = { ...ADMIN_HEADERS, ...options.headers };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const request = () => fetch(url, {
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
