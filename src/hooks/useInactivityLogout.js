import { useEffect, useRef } from 'react';

import { safeSession } from '../utils/safeStorage';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const INACTIVITY_CHECK_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

// Registra la última actividad sin recrear un temporizador por cada movimiento
// del ratón. Un único intervalo comprueba si ya venció la sesión.
const useInactivityLogout = (enabled, logout) => {
    const lastActivityRef = useRef(Date.now());

    useEffect(() => {
        if (!enabled) return undefined;

        lastActivityRef.current = Date.now();
        const recordActivity = () => { lastActivityRef.current = Date.now(); };
        const interval = setInterval(() => {
            if (Date.now() - lastActivityRef.current < INACTIVITY_TIMEOUT_MS) return;
            clearInterval(interval);
            safeSession.set('logoutReason', 'inactivity');
            void logout();
        }, INACTIVITY_CHECK_MS);

        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, recordActivity, { passive: true });
        }
        return () => {
            clearInterval(interval);
            for (const event of ACTIVITY_EVENTS) {
                window.removeEventListener(event, recordActivity);
            }
        };
    }, [enabled, logout]);
};

export default useInactivityLogout;
