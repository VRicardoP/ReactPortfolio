import { useState, useCallback } from 'react';
import FloatingWindow from './FloatingWindow';

const ContactWindow = ({ data, initialPosition }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyEmail = useCallback(() => {
        if (data?.email) {
            navigator.clipboard.writeText(data.email).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    }, [data?.email]);

    if (!data) return null;

    return (
        <FloatingWindow
            id="contact-window"
            title="Contact"
            initialPosition={initialPosition}
            initialSize={{ width: 350, height: 220 }}
        >
            <div className="contact-content">
                <p className="contact-message">{data.contact.message}</p>
                <div className="contact-email">
                    <strong>{data.email}</strong>
                </div>

                <button
                    className={`contact-copy-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopyEmail}
                >
                    {copied ? 'Copied!' : 'Copy Email'}
                </button>
            </div>
        </FloatingWindow>
    );
};

export default ContactWindow;