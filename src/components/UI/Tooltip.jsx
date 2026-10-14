// Envuelve cualquier elemento y le añade una burbuja de ayuda que aparece
// al pasar el ratón o el foco por encima, colocada automáticamente para
// que no se salga de la pantalla.

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../styles/tooltip.css';

const Tooltip = ({ children, text, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coordinates, setCoordinates] = useState({ left: 0, top: 0 });
    const wrapperRef = useRef(null);
    const tooltipRef = useRef(null);

    // Calcula en qué punto de la pantalla debe dibujarse la burbuja,
    // ajustándola si no cabe en el lado preferido o se saldría del borde.
    const updatePosition = useCallback(() => {
        if (!wrapperRef.current || !tooltipRef.current) return;

        const anchor = wrapperRef.current.getBoundingClientRect();
        const tooltip = tooltipRef.current.getBoundingClientRect();
        const gap = 8;
        const viewportGap = 8;
        let left = anchor.left + (anchor.width - tooltip.width) / 2;
        let top = position === 'bottom'
            ? anchor.bottom + gap
            : anchor.top - tooltip.height - gap;

        if (position === 'left') {
            left = anchor.left - tooltip.width - gap;
            top = anchor.top + (anchor.height - tooltip.height) / 2;
        } else if (position === 'right') {
            left = anchor.right + gap;
            top = anchor.top + (anchor.height - tooltip.height) / 2;
        } else if (top < viewportGap) {
            top = anchor.bottom + gap;
        } else if (top + tooltip.height > window.innerHeight - viewportGap) {
            top = anchor.top - tooltip.height - gap;
        }

        const maxLeft = Math.max(viewportGap, window.innerWidth - tooltip.width - viewportGap);
        const maxTop = Math.max(viewportGap, window.innerHeight - tooltip.height - viewportGap);
        setCoordinates({
            left: Math.min(Math.max(left, viewportGap), maxLeft),
            top: Math.min(Math.max(top, viewportGap), maxTop),
        });
    }, [position]);

    // Recalcula la posición mientras la burbuja está visible, por si la
    // página se desplaza o cambia de tamaño.
    useLayoutEffect(() => {
        if (!isVisible || !text) return undefined;

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isVisible, text, updatePosition]);

    return (
        <div
            ref={wrapperRef}
            className="tooltip-wrapper"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            {children}
            {isVisible && text && createPortal(
                <div
                    ref={tooltipRef}
                    className="cyberpunk-tooltip"
                    role="tooltip"
                    style={coordinates}
                >
                    <div className="tooltip-content">{text}</div>
                    <div className="tooltip-glow"></div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
