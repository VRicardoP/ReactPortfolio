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

                // mark that this session has already been tracked
                sessionStorage.setItem('visit_tracked', 'true');
            } catch (error) {
                // if tracking fails it's fine, don't want to break the page
                console.warn('Failed to track visit:', error.message);
            }
        };

        trackVisit();
    }, []);
};

export default useVisitorTracking;
