/**
 * DT-207 — el transporte del panel es el ÚNICO que conoce la base de admin y
 * sus cabeceras. Lo que antes repetían 17 ficheros (`${ADMIN_BACKEND_URL}` +
 * cabecera de ngrok + `credentials: 'include'`) se garantiza aquí una vez.
 *
 * Incluye la guarda de DT-129 (la petición SSE debe llevar la cabecera que
 * salta el aviso de ngrok), que antes vivía en el test del hook.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/api', () => ({
    BACKEND_URL: 'https://publico.ngrok-free.dev',
    DEFAULT_HEADERS: { 'ngrok-skip-browser-warning': 'true' },
    ADMIN_BACKEND_URL: 'https://admin.ngrok-free.dev',
    ADMIN_HEADERS: { 'ngrok-skip-browser-warning': 'true' },
}));

const { adminUrl, adminFetch, authenticatedRequest, SETTLED } = await import('../authFetch');

const ok = () => ({ ok: true, status: 200, json: async () => ({}) });

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ok()));
});
afterEach(() => {
    vi.unstubAllGlobals();
});

describe('adminUrl', () => {
    it('resuelve una ruta contra la base de admin', () => {
        expect(adminUrl('/api/v1/schools/')).toBe('https://admin.ngrok-free.dev/api/v1/schools/');
    });

    it('deja pasar una URL absoluta sin tocarla', () => {
        expect(adminUrl('https://otro.example/x')).toBe('https://otro.example/x');
    });
});

describe('adminFetch', () => {
    it('añade base, cabecera de ngrok y cookies en un solo sitio', async () => {
        await adminFetch('/api/v1/auth/token', { method: 'POST', body: 'a=b' });

        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://admin.ngrok-free.dev/api/v1/auth/token');
        expect(options.method).toBe('POST');
        expect(options.credentials).toBe('include');
        expect(options.headers['ngrok-skip-browser-warning']).toBe('true');
    });

    it('las cabeceras del llamador se suman, no sustituyen a las de la base', async () => {
        await adminFetch('/x', { headers: { 'Content-Type': 'application/json' } });

        const [, options] = fetch.mock.calls[0];
        expect(options.headers).toEqual({
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json',
        });
    });
});

describe('authenticatedRequest', () => {
    const sesion = () => ({
        epoch: 1,
        currentEpoch: () => 1,
        tryRefresh: vi.fn(async () => SETTLED.COMMITTED),
        logout: vi.fn(),
    });

    it('DT-129: la petición del stream lleva la cabecera de ngrok y resuelve la base', async () => {
        await authenticatedRequest('/api/v1/notifications/stream', {}, sesion());

        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://admin.ngrok-free.dev/api/v1/notifications/stream');
        expect(options.headers['ngrok-skip-browser-warning']).toBe('true');
        expect(options.credentials).toBe('include');
    });

    it('pone Content-Type JSON solo cuando hay cuerpo y nadie lo fijó', async () => {
        await authenticatedRequest('/x', { method: 'POST', body: '{}' }, sesion());
        expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');

        await authenticatedRequest('/y', {}, sesion());
        expect(fetch.mock.calls[1][1].headers['Content-Type']).toBeUndefined();
    });

    it('tras un 401 renueva una vez y repite contra la misma URL resuelta', async () => {
        fetch.mockImplementationOnce(async () => ({ ok: false, status: 401, json: async () => ({}) }));
        const s = sesion();

        await authenticatedRequest('/api/v1/schools/', {}, s);

        expect(s.tryRefresh).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.calls[1][0]).toBe('https://admin.ngrok-free.dev/api/v1/schools/');
    });
});
