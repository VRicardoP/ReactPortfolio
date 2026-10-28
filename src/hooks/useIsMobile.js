// Dice si la pantalla actual pide el diseño compacto (móvil, móvil en
// horizontal, tablet o cualquier pantalla táctil sin ratón hasta 1024 px) y
// se actualiza solo si el usuario gira el dispositivo o cambia el tamaño de
// la ventana. El criterio vive en config/layout.js.
//
// Además escribe el resultado en <html data-layout="compact|desktop"> para
// que el CSS decida con el MISMO criterio (por ejemplo, si el body hace
// scroll) sin repetir la consulta en cada hoja de estilo.

import { useState, useEffect } from 'react';
import {
    COMPACT_LAYOUT_QUERY,
    LAYOUT_ATTRIBUTE,
    LAYOUT_COMPACT,
    LAYOUT_DESKTOP,
} from '../config/layout';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia(COMPACT_LAYOUT_QUERY).matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(COMPACT_LAYOUT_QUERY);
        const handler = (e) => setIsMobile(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute(
            LAYOUT_ATTRIBUTE,
            isMobile ? LAYOUT_COMPACT : LAYOUT_DESKTOP,
        );
    }, [isMobile]);

    return isMobile;
};

export default useIsMobile;
