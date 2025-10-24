import { useEffect, useState } from 'react';
import '../../styles/toast.css';

let toastId = 0;
const toastListeners = new Set();
const activeToasts = new Map(); // Para evitar duplicados

export const showToast = (message, duration = 3000) => {
    // Evitar duplicados del mismo mensaje
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

const Toast = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const listener = (toast) => {
            if (toast.visible) {
                setToasts(prev => {
                    // Evitar añadir si ya existe
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
        <div className="toast-container">
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