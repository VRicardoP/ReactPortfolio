import { useState, useCallback } from 'react';
import { BACKEND_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to handle job application: opens URL and tracks in backend pipeline.
 * Deduplicates by job ID so the same job isn't applied to twice.
 */
export default function useJobApplication() {
    const { authenticatedFetch } = useAuth();
    const [appliedIds, setAppliedIds] = useState(new Set());

    const handleApply = useCallback(async (job) => {
        if (job.url) {
            window.open(job.url, '_blank', 'noopener,noreferrer');
        }
        if (appliedIds.has(job.id)) return;
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/`, {
                method: 'POST',
                body: JSON.stringify({
                    title: job.title,
                    company: job.company,
                    url: job.url || null,
                    source: job.source,
                    status: 'applied',
                }),
            });
            setAppliedIds(prev => new Set(prev).add(job.id));
        } catch {
            // URL already opened — silently fail
        }
    }, [authenticatedFetch, appliedIds]);

    return { handleApply, appliedIds };
}
