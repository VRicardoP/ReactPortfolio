// Avisa al servidor de que alguien ha visitado la página, una sola vez por
// cada sesión del navegador (no en cada recarga de la ventana).

import { useEffect } from 'react';
import { BACKEND_URL, DEFAULT_HEADERS } from '../config/api';
import { safeSession } from '../utils/safeStorage';

// this hook tracks the user's visit in the backend
const useVisitorTracking = () => {
    useEffect(() => {
        const trackVisit = async () => {
            try {
                // only track once per session
                const alreadyTracked = safeSession.get('visit_tracked');
                if (alreadyTracked) {
                    return;
                }

                const response = await fetch(`${BACKEND_URL}/api/v1/analytics/track`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...DEFAULT_HEADERS,
                    },
                    body: JSON.stringify({
                        page_url: window.location.href,
                        referrer: document.referrer || null,
                        user_agent: navigator.userAgent
                    })
                });

                if (response.ok) {
                    // mark that this session has already been tracked
                    safeSession.set('visit_tracked', 'true');
                }
            } catch (error) {
                // prevent retry loops on failure — mark as tracked even on error
                safeSession.set('visit_tracked', 'true');
                console.warn('Failed to track visit:', error.message);
            }
        };

        trackVisit();
    }, []);
};

export default useVisitorTracking;
