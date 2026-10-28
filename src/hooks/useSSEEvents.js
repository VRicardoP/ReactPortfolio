// Mantiene abierto el canal de eventos del servidor y vuelve a conectarlo si
// termina, falla o deja de recibir incluso los keepalives esperados.

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/UI/Toast';
import i18n from '../i18n';

const HEARTBEAT_MS = 25_000;
const INACTIVITY_MS = HEARTBEAT_MS * 3;
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 30_000;

export const useSSEEvents = () => {
    const { authenticatedFetch, isAuthenticated } = useAuth();
    const reconnectAttemptsRef = useRef(0);
    const lastEventAtRef = useRef(0);

    // Mientras haya sesión, procesa el stream y vigila que sigan llegando bytes.
    // A single scheduler owns retries for HTTP failures, EOF, errors and inactivity.
    useEffect(() => {
        if (!isAuthenticated) return;

        let mounted = true;
        let controller;
        let reconnectTimer;
        let watchdogTimer;

        const clearWatchdog = () => {
            if (watchdogTimer) {
                clearInterval(watchdogTimer);
                watchdogTimer = undefined;
            }
        };

        const scheduleReconnect = () => {
            clearWatchdog();
            if (!mounted) return;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            const delay = Math.min(
                RECONNECT_BASE_MS * (2 ** reconnectAttemptsRef.current),
                RECONNECT_MAX_MS,
            );
            reconnectAttemptsRef.current += 1;
            reconnectTimer = setTimeout(connectSSE, delay);
        };

        // Abre una conexión y traduce únicamente los eventos que usa el dashboard.
        // Any received chunk, including an SSE comment keepalive, refreshes liveness.
        const connectSSE = async () => {
            if (!mounted) return;
            controller = new AbortController();
            lastEventAtRef.current = Date.now();
            clearWatchdog();
            watchdogTimer = setInterval(() => {
                if (Date.now() - lastEventAtRef.current >= INACTIVITY_MS) {
                    controller.abort();
                    scheduleReconnect();
                }
            }, HEARTBEAT_MS);

            try {
                // DT-129: ngrok (el túnel que expone el backend a internet)
                // intercepta la primera petición de cada visitante con una
                // página de aviso HTML en vez de la respuesta real, a menos que
                // lleve una cabecera que la salte — si no, este stream recibiría
                // esa página de aviso en vez de eventos. La cabecera la pone el
                // transporte (services/authFetch.js), no este hook — ver su test.
                const response = await authenticatedFetch(
                    '/api/v1/notifications/stream',
                    { signal: controller.signal },
                );
                if (!response.ok) {
                    scheduleReconnect();
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (mounted && !controller.signal.aborted) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    lastEventAtRef.current = Date.now();
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const message = JSON.parse(line.slice(6));
                            const payload = message?.data ?? {};
                            reconnectAttemptsRef.current = 0;
                            if (message.type === 'new_jobs' && payload.source && payload.count) {
                                const sourceName = payload.source.charAt(0).toUpperCase() + payload.source.slice(1);
                                showToast(i18n.t('dashboard.newJobs.toast', {
                                    count: payload.count,
                                    source: sourceName,
                                }), 4000);
                            }
                            if (message.type === 'new_visitor' || message.type === 'new_chat') {
                                window.dispatchEvent(new CustomEvent('dashboard-data-stale', {
                                    detail: { scope: message.type },
                                }));
                            }
                        } catch {
                            // Ignore malformed data while keeping the stream alive.
                        }
                    }
                }

                if (!controller.signal.aborted) {
                    console.warn('SSE stream ended; scheduling reconnect');
                    scheduleReconnect();
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('SSE connection error:', error);
                    scheduleReconnect();
                }
            } finally {
                clearWatchdog();
            }
        };

        void connectSSE();

        return () => {
            mounted = false;
            clearWatchdog();
            if (reconnectTimer) clearTimeout(reconnectTimer);
            controller?.abort();
        };
    }, [authenticatedFetch, isAuthenticated]);
};
