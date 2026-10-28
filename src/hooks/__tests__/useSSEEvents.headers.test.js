/** DT-129: the SSE request must preserve the ngrok bypass header.
 *
 * DT-207 (2026-10-28): the header is no longer the hook's job. The hook hands
 * the transport a PATH and nothing else; `services/authFetch.js` resolves the
 * admin base and adds the ngrok header for every panel request. That guarantee
 * now lives in `services/__tests__/authFetch.test.js`. What this test keeps:
 * the hook goes through `authenticatedFetch` (cookie session, refresh cycle),
 * passes the stream path, and never sets an Authorization header of its own.
 */
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

beforeEach(() => { calls = []; });

it('the stream goes through authenticatedFetch with a path and no Authorization header', async () => {
    const { useSSEEvents } = await import('../useSSEEvents');
    renderHook(() => useSSEEvents());

    expect(calls).toHaveLength(1);
    const { url, options } = calls[0];
    expect(url).toBe('/api/v1/notifications/stream');
    expect(options.headers?.Authorization).toBeUndefined();
    expect(options.signal).toBeInstanceOf(AbortSignal);
});
