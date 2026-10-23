// Panel para recuperar documentos (currículum/carta) cuya generación se
// quedó pendiente de entregar: lista los casos atascados y permite
// reintentar cada uno sin volver a generarlo desde cero.

import { useTranslation } from 'react-i18next';
import useDeliveryRecovery from '../../hooks/useDeliveryRecovery';

/** Delivery only: no regeneration path, even after the application was deleted. */
export default function DocumentDeliveryRecovery({ onDelivered, clearOperation }) {
    const { t } = useTranslation();
    const { items, busy, error, refresh, retry } = useDeliveryRecovery(
        onDelivered,
        clearOperation,
    );
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
