import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT_PX = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        const handler = (e) => setIsMobile(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return isMobile;
};

export default useIsMobile;
