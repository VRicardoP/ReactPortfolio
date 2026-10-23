// Dice si la pantalla actual es de tamaño móvil o no, y se actualiza solo
// si el usuario gira el dispositivo o cambia el tamaño de la ventana.

import { useState, useEffect } from 'react';
import { MOBILE_BREAKPOINT } from '../config/layout';

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

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
