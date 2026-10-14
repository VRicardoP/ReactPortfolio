// Muestra avisos flotantes ("toasts") en la esquina de la pantalla, como
// "Guardado" o "Error al enviar". Cualquier parte de la app puede llamar a
// showToast(mensaje) para lanzar uno, sin tener que pasar props por medio
// mundo.

import { useEffect, useState } from 'react';
import '../../styles/toast.css';

let toastId = 0;
const toastListeners = new Set();
const activeToasts = new Map(); // here I store the toasts that are already active

// Lanza un aviso nuevo; si ya hay uno visible con el mismo mensaje, no lo
// repite. Se oculta solo pasado el tiempo indicado.
// eslint-disable-next-line react-refresh/only-export-components
export const showToast = (message, duration = 3000) => {
    // if there's already a toast with this message don't show it again
    if (activeToasts.has(message)) {
        return;
    }

    const id = toastId++;
    const toast = { id, message, visible: true };

    activeToasts.set(message, id);

    toastListeners.forEach(listener => listener(toast));

    setTimeout(() => {
        toastListeners.forEach(listener => listener({ id, visible: false }));
        activeToasts.delete(message);
    }, duration);
};

// Componente que realmente dibuja los avisos en pantalla; se suscribe a
// showToast para saber cuándo aparece o desaparece cada uno.
const Toast = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const listener = (toast) => {
            if (toast.visible) {
                setToasts(prev => {
                    // check that it's not duplicated
                    if (prev.find(t => t.id === toast.id)) {
                        return prev;
                    }
                    return [...prev, toast];
                });
            } else {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }
        };

        toastListeners.add(listener);
        return () => toastListeners.delete(listener);
    }, []);

    return (
        <div className="toast-container" role="status" aria-live="polite">
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    className="cyberpunk-toast"
                    style={{ bottom: `${20 + index * 70}px` }}
                >
                    <div className="toast-border"></div>
                    <div className="toast-content">
                        <div className="toast-icon">
                            <div className="toast-icon-pulse"></div>
                        </div>
                        <div className="toast-message">{toast.message}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Toast;