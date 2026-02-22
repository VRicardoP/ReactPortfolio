import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const SOCIAL_LINKS = [
    { key: 'linkedin', label: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
    { key: 'github', label: 'GitHub', prefix: 'https://github.com/' },
    { key: 'twitter', label: 'Twitter', prefix: 'https://twitter.com/' },
];

const ContactWindow = ({ data, initialPosition }) => {
    const [copied, setCopied] = useState(false);
    const { t } = useTranslation();

    const handleCopyEmail = useCallback(() => {
        if (data?.email) {
            navigator.clipboard.writeText(data.email)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch((err) => {
                    console.warn('Failed to copy to clipboard:', err);
                });
        }
    }, [data?.email]);

    if (!data) return null;

    const social = data.contact?.social || {};

    return (
        <FloatingWindow
            id="contact-window"
            title={t('windows.contact')}
            initialPosition={initialPosition}
            initialSize={{ width: 380, height: 340 }}
        >
            <div className="contact-content">
                <p className="contact-message">{data.contact.message}</p>

                <div className="contact-info-grid">
                    <div className="contact-info-row">
                        <span className="contact-info-icon">@</span>
                        <strong className="contact-email-text">{data.email}</strong>
                        <button
                            className={`contact-copy-btn-inline ${copied ? 'copied' : ''}`}
                            onClick={handleCopyEmail}
                        >
                            {copied ? t('contact.copied') : t('contact.copyEmail')}
                        </button>
                    </div>

                </div>

                <div className="contact-social-links">
                    {SOCIAL_LINKS.map(({ key, label, prefix }) => {
                        const value = social[key];
                        const url = value && (value.startsWith('http') ? value : `${prefix}${value}`);
                        return (
                            <a
                                key={key}
                                href={url || '#'}
                                target={url ? '_blank' : undefined}
                                rel={url ? 'noopener noreferrer' : undefined}
                                className={`contact-social-link ${!value ? 'disabled' : ''}`}
                                onClick={!value ? (e) => e.preventDefault() : undefined}
                            >
                                [{label}]
                            </a>
                        );
                    })}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default ContactWindow;