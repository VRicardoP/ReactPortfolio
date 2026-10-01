/**
 * DT-129 — el stream del dashboard no conectaba NUNCA en producción.
 *
 * El hook pedía `/notifications/stream` con solo `Authorization`. El túnel ngrok
 * contesta a un navegador con su página de aviso (HTML, `ERR_NGROK_6024`) SIN
 * `Access-Control-Allow-Origin`, así que el navegador lo leía como error de
 * CORS y reintentaba en bucle, sin nada visible en pantalla. `DEFAULT_HEADERS`
 * existe para eso en `config/api.js` y este hook no lo usaba.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ token: 'jwt-de-prueba', isAuthenticated: true }),
}));
vi.mock('../../components/UI/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../i18n', () => ({ default: { t: k => k, language: 'es' } }));
// El backend es un túnel ngrok, que es cuando DEFAULT_HEADERS lleva la cabecera.
vi.mock('../../config/api', () => ({
    BACKEND_URL: 'https://ejemplo.ngrok-free.dev',
    DEFAULT_HEADERS: { 'ngrok-skip-browser-warning': 'true' },
}));

let llamadas;

beforeEach(() => {
    llamadas = [];
    globalThis.fetch = vi.fn((url, opciones) => {
        llamadas.push({ url, opciones });
        // Nunca resuelve: basta con haber capturado la petición.
        return new Promise(() => {});
    });
});

it('el stream viaja con DEFAULT_HEADERS y con el token', async () => {
    const { useSSENotifications } = await import('../useSSENotifications');
    renderHook(() => useSSENotifications());

    expect(llamadas).toHaveLength(1);
    const { url, opciones } = llamadas[0];
    expect(url).toContain('/api/v1/notifications/stream');
    expect(opciones.headers['ngrok-skip-browser-warning']).toBe('true');
    expect(opciones.headers.Authorization).toBe('Bearer jwt-de-prueba');
});
