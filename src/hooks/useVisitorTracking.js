import { useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';

// este hook registra la visita del usuario en el backend
const useVisitorTracking = () => {
    useEffect(() => {
        const trackVisit = async () => {
            try {
                // solo registro una vez por sesion
                const alreadyTracked = sessionStorage.getItem('visit_tracked');
                if (alreadyTracked) {
                    return;
                }

                await fetch(`${BACKEND_URL}/api/v1/analytics/track`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        page_url: window.location.href,
                        referrer: document.referrer || null,
                        user_agent: navigator.userAgent
                    })
                });

                // marco que ya se registro esta sesion
                sessionStorage.setItem('visit_tracked', 'true');
            } catch (error) {
                // si falla el tracking no pasa nada, no quiero romper la pagina
                console.warn('Failed to track visit:', error.message);
            }
        };

        trackVisit();
    }, []);
};

export default useVisitorTracking;
