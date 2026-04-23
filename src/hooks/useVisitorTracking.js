import { useEffect } from 'react';
import { BACKEND_URL } from '../config/api';

// this hook tracks the user's visit in the backend
const useVisitorTracking = () => {
    useEffect(() => {
        const trackVisit = async () => {
            try {
                // only track once per session
                const alreadyTracked = sessionStorage.getItem('visit_tracked');
                if (alreadyTracked) {
                    return;
                }

                const response = await fetch(`${BACKEND_URL}/api/v1/analytics/track`, {
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

                if (response.ok) {
                    // mark that this session has already been tracked
                    sessionStorage.setItem('visit_tracked', 'true');
                }
            } catch (error) {
                // prevent retry loops on failure — mark as tracked even on error
                sessionStorage.setItem('visit_tracked', 'true');
                console.warn('Failed to track visit:', error.message);
            }
        };

        trackVisit();
    }, []);
};

export default useVisitorTracking;
