import { useEffect, useState } from 'react';
import '../../styles/toast.css';

let toastId = 0;
const toastListeners = new Set();

export const showToast = (message, duration = 3000) => {
    const id = toastId++;
    const toast = { id, message, visible: true };

    toastListeners.forEach(listener => listener(toast));

    setTimeout(() => {
        toastListeners.forEach(listener => listener({ id, visible: false }));
    }, duration);
};

const Toast = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const listener = (toast) => {
            if (toast.visible) {
                setToasts(prev => [...prev, toast]);
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