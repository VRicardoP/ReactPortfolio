import { useCallback, useState } from 'react';

import { useAuth } from '../context/AuthContext';

const ENDPOINT = `/api/v1/cv-generation/operations/`;

// Recupera entregas pendientes; nunca inicia una generación nueva.
const useDeliveryRecovery = (onDelivered, clearOperation) => {
    const { authenticatedFetch } = useAuth();
    const [items, setItems] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        const response = await authenticatedFetch(ENDPOINT);
        const data = await response.json();
        if (!Array.isArray(data) || data.some(item => (
            !item || typeof item.operation_id !== 'string'
        ))) {
            throw new Error('Invalid delivery list');
        }
        setItems(data);
    }, [authenticatedFetch]);

    const refresh = useCallback(async () => {
        setBusy(true);
        setError(false);
        try {
            await load();
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }, [load]);

    const retry = useCallback(async (item) => {
        setBusy(true);
        setError(false);
        try {
            const response = await authenticatedFetch(
                `${ENDPOINT}${item.operation_id}/retry`,
                { method: 'POST' },
            );
            const result = await response.json();
            if (result.status !== 'delivered') throw new Error('Still pending');
            clearOperation?.(item.operation_id);
            await load();
            onDelivered?.(item.application_id);
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    }, [authenticatedFetch, clearOperation, load, onDelivered]);

    return { items, busy, error, refresh, retry };
};

export default useDeliveryRecovery;
