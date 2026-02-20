import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';

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
                                const data = JSON.parse(line.slice(6));
                                reconnectAttempts.current = 0;

                                // Show toast for new jobs events
                                if (data.type === 'new_jobs' && data.source && data.count) {
                                    const sourceName = data.source.charAt(0).toUpperCase() + data.source.slice(1);
                                    showToast(`${data.count} new jobs from ${sourceName}`, 4000);
                                }

                                setNotifications(prev => [
                                    { id: Date.now() + Math.random(), ...data },
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
