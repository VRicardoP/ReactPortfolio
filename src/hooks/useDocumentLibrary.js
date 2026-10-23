import { useCallback, useState } from 'react';

import { BACKEND_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

const ENDPOINT = `${BACKEND_URL}/api/v1/cv-generation/`;

// Carga y elimina documentos retenidos sin mezclar HTTP con su presentación.
const useDocumentLibrary = (onDeleted, t) => {
    const { authenticatedFetch } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const refresh = useCallback(async () => {
        setBusy(true);
        setError(false);
        try {
            const response = await authenticatedFetch(ENDPOINT);
            const items = await response.json();
            if (!Array.isArray(items) || items.some(item => !item || typeof item.id !== 'string')) {
                throw new Error('Invalid document list');
            }
            setDocuments(items);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }, [authenticatedFetch]);

    const remove = useCallback(async (document) => {
        if (!window.confirm(t('dashboard.cvGeneration.confirmDeleteDocument'))) return;
        setBusy(true);
        setError(false);
        try {
            await authenticatedFetch(ENDPOINT + document.id, { method: 'DELETE' });
            setDocuments(current => current.filter(item => item.id !== document.id));
            onDeleted?.(document.application_id);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }, [authenticatedFetch, onDeleted, t]);

    return { documents, busy, error, refresh, remove };
};

export default useDocumentLibrary;
