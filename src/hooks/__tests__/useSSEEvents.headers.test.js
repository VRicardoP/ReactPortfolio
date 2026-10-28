/** DT-129: the SSE request must preserve the ngrok bypass header. */
import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

let calls;

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: true,
        authenticatedFetch: (url, options) => {
            calls.push({ url, options });
            return new Promise(() => {});
        },
    }),
}));
vi.mock('../../components/UI/Toast', () => ({ showToast: vi.fn() }));
vi.mock('../../i18n', () => ({ default: { t: key => key, language: 'es' } }));
vi.mock('../../config/api', () => ({
    BACKEND_URL: 'https://ejemplo.ngrok-free.dev',
    DEFAULT_HEADERS: { 'ngrok-skip-browser-warning': 'true' },
    ADMIN_BACKEND_URL: 'https://ejemplo.ngrok-free.dev',
    ADMIN_HEADERS: { 'ngrok-skip-browser-warning': 'true' },
}));

beforeEach(() => { calls = []; });

it('the stream uses authenticatedFetch and keeps the ngrok header', async () => {
    const { useSSEEvents } = await import('../useSSEEvents');
    renderHook(() => useSSEEvents());

    expect(calls).toHaveLength(1);
    const { url, options } = calls[0];
    expect(url).toContain('/api/v1/notifications/stream');
    expect(options.headers['ngrok-skip-browser-warning']).toBe('true');
    expect(options.headers.Authorization).toBeUndefined();
});
