import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config/api';

/** Delivery only: no regeneration path, even after the application was deleted. */
export default function DocumentDeliveryRecovery({ onDelivered }) {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const [items, setItems] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const endpoint = `${BACKEND_URL}/api/v1/cv-generation/operations/`;

    const load = async () => {
        const response = await authenticatedFetch(endpoint);
        const data = await response.json();
        if (!Array.isArray(data) || data.some(x => !x || typeof x.operation_id !== 'string')) {
            throw new Error('Invalid delivery list');
        }
        setItems(data);
    };
    const refresh = async () => {
        setBusy(true);
        setError(false);
        try { await load(); } catch { setError(true); } finally { setBusy(false); }
    };
    const retry = async (item) => {
        setBusy(true);
        setError(false);
        try {
            const response = await authenticatedFetch(endpoint + item.operation_id + '/retry', { method: 'POST' });
            const result = await response.json();
            if (result.status !== 'delivered') throw new Error('Still pending');
            // Clear only this acknowledged operation. An explicit future Generate
            // must be new work, not a replay of the recovered delivery.
            for (const key of Object.keys(sessionStorage)) {
                if (key.startsWith('document-operation:') &&
                    sessionStorage.getItem(key) === item.operation_id) sessionStorage.removeItem(key);
            }
            await load();
            onDelivered?.(item.application_id);
        } catch { setError(true); } finally { setBusy(false); }
    };
    return (
        <section className="document-delivery-recovery" aria-busy={busy}>
            <button type="button" className="cv-gen-btn" disabled={busy} onClick={refresh}>
                {t('dashboard.cvGeneration.pendingDeliveries')}
            </button>
            {error && <p role="alert">{t('dashboard.cvGeneration.deliveryPending')}</p>}
            {items && items.length === 0 && <p>{t('dashboard.cvGeneration.noPendingDeliveries')}</p>}
            <ul>
                {items?.map(item => (
                    <li key={item.operation_id}>
                        <span>{item.created_at} · {item.application_id}</span>
                        {item.error === 'receipt_window_expired' ? (
                            <p role="alert">{t('dashboard.cvGeneration.deliveryExpired')}</p>
                        ) : (
                            <button type="button" className="cv-gen-btn" disabled={busy} onClick={() => retry(item)}>
                                {t('dashboard.cvGeneration.retryDelivery')}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
