/**
 * Apunta cómo interactúa el visitante con la página (clics y cuánto tiempo
 * mira cada ventana), y manda esos datos al servidor en lotes cada 10
 * segundos (o justo antes de cerrar la página) para el mapa de calor.
 *
 * Tracks user interactions on the portfolio page:
 * - Clicks with viewport-normalized coordinates
 * - Window focus duration (via custom events from WindowContext)
 * - Session duration
 *
 * Events are batched in memory and flushed every 10s or on page unload.
 * Uses navigator.sendBeacon for reliable delivery on unload.
 */
import { useEffect, useRef } from 'react';
import { BACKEND_URL, DEFAULT_HEADERS } from '../config/api';
import { safeSession } from '../utils/safeStorage';

const FLUSH_INTERVAL_MS = 10000;
const MAX_BATCH_SIZE = 50;
const INTERACTIONS_ENDPOINT = `${BACKEND_URL}/api/v1/analytics/interactions`;

const useInteractionTracking = () => {
    const bufferRef = useRef([]);
    const sessionIdRef = useRef(null);
    const focusTimersRef = useRef({});

    useEffect(() => {
        // Generate or retrieve session ID
        let sid = safeSession.get('interaction_session_id');
        if (!sid) {
            sid = crypto.randomUUID();
            safeSession.set('interaction_session_id', sid);
        }
        sessionIdRef.current = sid;

        // Set session start time
        if (!safeSession.get('interaction_session_start')) {
            safeSession.set('interaction_session_start', String(Date.now()));
        }

        // --- Flush batched events to backend ---
        // useBeacon=true for beforeunload (fire-and-forget), false for interval flush
        // Envía al servidor el lote de eventos guardados hasta ahora, y lo vacía.
        const flush = (useBeacon = false) => {
            if (bufferRef.current.length === 0) return;

            const payload = JSON.stringify({
                session_id: sessionIdRef.current,
                events: bufferRef.current.splice(0),
            });

            if (useBeacon && navigator.sendBeacon) {
                navigator.sendBeacon(
                    INTERACTIONS_ENDPOINT,
                    new Blob([payload], { type: 'text/plain' })
                );
            } else {
                fetch(INTERACTIONS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...DEFAULT_HEADERS },
                    body: payload,
                    keepalive: true,
                }).catch(() => {});
            }
        };

        // --- Click handler ---
        // Anota un clic y en qué parte de la pantalla se hizo.
        const handleClick = (e) => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const windowEl = e.target?.closest?.('.floating-window');
            const windowId = windowEl?.id || null;

            bufferRef.current.push({
                event_type: 'click',
                viewport_x: +(e.clientX / vw).toFixed(4),
                viewport_y: +(e.clientY / vh).toFixed(4),
                target_element: windowId || e.target?.tagName?.toLowerCase() || 'unknown',
                viewport_width: vw,
                viewport_height: vh,
            });

            if (bufferRef.current.length >= MAX_BATCH_SIZE) flush();
        };

        // --- Window focus/blur via custom events from WindowContext ---
        // Apunta el momento en que una ventana pasa a estar activa.
        const handleWindowFocus = (e) => {
            const { windowId } = e.detail;
            focusTimersRef.current[windowId] = Date.now();
        };

        // Cuando una ventana deja de estar activa, calcula cuánto tiempo
        // estuvo en primer plano y lo guarda.
        const handleWindowBlur = (e) => {
            const { windowId } = e.detail;
            const start = focusTimersRef.current[windowId];
            if (start) {
                bufferRef.current.push({
                    event_type: 'focus',
                    window_id: windowId,
                    duration_ms: Date.now() - start,
                });
                delete focusTimersRef.current[windowId];
            }
        };

        // --- Page unload: flush remaining data ---
        // Justo antes de cerrar la página, cierra las ventanas que seguían
        // activas, anota el fin de la sesión, y envía todo lo pendiente.
        const handleUnload = () => {
            // Flush any open focus timers
            Object.entries(focusTimersRef.current).forEach(([wid, start]) => {
                bufferRef.current.push({
                    event_type: 'focus',
                    window_id: wid,
                    duration_ms: Date.now() - start,
                });
            });
            focusTimersRef.current = {};

            // Add session_end event
            const sessionStart = safeSession.get('interaction_session_start');
            if (sessionStart) {
                bufferRef.current.push({
                    event_type: 'session_end',
                    duration_ms: Date.now() - parseInt(sessionStart, 10),
                });
            }
            flush(true);
        };

        // Register all listeners
        document.addEventListener('click', handleClick);
        window.addEventListener('window-focused', handleWindowFocus);
        window.addEventListener('window-blurred', handleWindowBlur);
        window.addEventListener('beforeunload', handleUnload);
        const interval = setInterval(() => flush(false), FLUSH_INTERVAL_MS);

        return () => {
            document.removeEventListener('click', handleClick);
            window.removeEventListener('window-focused', handleWindowFocus);
            window.removeEventListener('window-blurred', handleWindowBlur);
            window.removeEventListener('beforeunload', handleUnload);
            clearInterval(interval);
        };
    }, []);
};

export default useInteractionTracking;
