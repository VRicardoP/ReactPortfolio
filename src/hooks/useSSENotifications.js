import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
import i18n from '../i18n';

export const useSSENotifications = () => {
    const { token, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const controllerRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimerRef = useRef(null);

    const dismissNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !token) return;

        const controller = new AbortController();
        controllerRef.current = controller;

        const connectSSE = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/v1/notifications/stream`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal,
                });

                if (!response.ok) return;

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                // Backend wraps all events as {"type":"...","data":{...},"timestamp":"..."}
                                const message = JSON.parse(line.slice(6));
                                const payload = message?.data ?? {};
                                reconnectAttempts.current = 0;

                                // Show toast for new jobs events
                                if (message.type === 'new_jobs' && payload.source && payload.count) {
                                    const sourceName = payload.source.charAt(0).toUpperCase() + payload.source.slice(1);
                                    showToast(i18n.t('dashboard.newJobs.toast', { count: payload.count, source: sourceName }), 4000);
                                }

                                setNotifications(prev => [
                                    { id: Date.now() + Math.random(), type: message.type, timestamp: message.timestamp, ...payload },
                                    ...prev.slice(0, 19)
                                ]);
                            } catch {
                                // Ignore malformed data
                            }
                        }
                    }
                }

                // If we reach here, stream ended normally — reconnect
                if (!controller.signal.aborted) {
                    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts.current), 30000);
                    reconnectAttempts.current++;
                    console.warn(`SSE stream ended, reconnecting in ${delay}ms...`);
                    reconnectTimerRef.current = setTimeout(connectSSE, delay);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('SSE connection error:', err);
                }
            }
        };

        connectSSE();

        return () => {
            controller.abort();
            controllerRef.current = null;
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };
    }, [isAuthenticated, token]);

    return { notifications, dismissNotification, clearAll };
};
