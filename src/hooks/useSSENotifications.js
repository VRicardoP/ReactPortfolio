import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

export const useSSENotifications = () => {
    const { token, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const controllerRef = useRef(null);

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
        };
    }, [isAuthenticated, token]);

    return { notifications, dismissNotification, clearAll };
};
