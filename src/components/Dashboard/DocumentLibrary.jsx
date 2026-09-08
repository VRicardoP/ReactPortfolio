import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../config/api';

/** Full history, independent of live applications. Never regenerate from this view. */
export default function DocumentLibrary({ onDownloadPdf, onDownloadJson, onDeleted }) {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const id = useId();
    const [open, setOpen] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);
    const endpoint = `${BACKEND_URL}/api/v1/cv-generation/`;

    const refresh = async () => {
        setBusy(true);
        setError(false);
        try {
            const response = await authenticatedFetch(endpoint);
            const items = await response.json();
            if (!Array.isArray(items) || items.some(d => !d || typeof d.id !== 'string')) {
                throw new Error('Invalid document list');
            }
            setDocuments(items);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (doc) => {
        if (!window.confirm(t('dashboard.cvGeneration.confirmDeleteDocument'))) return;
        setBusy(true);
        setError(false);
        try {
            await authenticatedFetch(endpoint + doc.id, { method: 'DELETE' });
            setDocuments(previous => previous.filter(item => item.id !== doc.id));
            onDeleted?.(doc.application_id);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="document-library">
            <button type="button" className="cv-gen-btn" aria-expanded={open}
                aria-controls={id} disabled={busy} onClick={() => {
                    setOpen(!open);
                    if (!open) refresh();
                }}>
                {t('dashboard.cvGeneration.library')}
            </button>
            {open && (
                <div id={id} aria-busy={busy}>
                    <p>{t('dashboard.cvGeneration.retentionNotice')}</p>
                    <button type="button" className="cv-gen-btn" disabled={busy} onClick={refresh}>
                        {t('dashboard.cvGeneration.refreshLibrary')}
                    </button>
                    {error && <p role="alert">{t('dashboard.cvGeneration.libraryError')}</p>}
                    {!busy && !error && documents.length === 0 && (
                        <p>{t('dashboard.cvGeneration.noDocuments')}</p>
                    )}
                    <ul className="document-library-list">
                        {documents.map(doc => {
                            const isCv = doc.doc_type === 'cv';
                            const filename = isCv ? 'cv_adapted' : 'cover_letter';
                            const snapshot = doc.application_snapshot || {};
                            return (
                                <li key={doc.id}>
                                    <p>{snapshot.title || doc.application_id} · {snapshot.company || ''}
                                        {' · '}{t(`dashboard.cvGeneration.${isCv ? 'tabCv' : 'tabCoverLetter'}`)}
                                        {' · '}{doc.language} · {doc.created_at}
                                    </p>
                                    <div className="cv-gen-actions">
                                        <button type="button" className="cv-gen-btn" disabled={busy}
                                            onClick={() => onDownloadPdf(doc.id, filename + '.pdf')}>
                                            {t('dashboard.cvGeneration.downloadPdf')}
                                        </button>
                                        <button type="button" className="cv-gen-btn" disabled={busy}
                                            onClick={() => onDownloadJson(doc.id, filename + '.json')}>
                                            {t('dashboard.cvGeneration.downloadJson')}
                                        </button>
                                        <button type="button" className="cv-gen-btn cv-gen-btn-reject"
                                            disabled={busy} onClick={() => remove(doc)}>
                                            {t('dashboard.cvGeneration.deleteDocument')}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}
