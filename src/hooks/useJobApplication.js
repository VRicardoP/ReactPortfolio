import { useState, useCallback, useRef } from 'react';
import { BACKEND_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to handle job applications: apply (opens URL + saves as applied)
 * and save-to-board (saves as saved for later review in pipeline).
 * Deduplicates by job ID so the same job isn't processed twice.
 */
export default function useJobApplication() {
    const { authenticatedFetch } = useAuth();
    const [appliedIds, setAppliedIds] = useState(new Set());
    const [savedIds, setSavedIds] = useState(new Set());
    const savingRef = useRef(new Set());

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

    const handleSave = useCallback(async (job) => {
        if (savedIds.has(job.id) || savingRef.current.has(job.id)) return;
        savingRef.current.add(job.id);
        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/`, {
                method: 'POST',
                body: JSON.stringify({
                    title: job.title || '',
                    company: job.company || '',
                    url: job.url || null,
                    source: job.source || null,
                    status: 'saved',
                    description: job.description || null,
                }),
            });
            if (response.ok) {
                setSavedIds(prev => new Set(prev).add(job.id));
            }
        } catch {
            // Save failed — silently fail
        } finally {
            savingRef.current.delete(job.id);
        }
    }, [authenticatedFetch, savedIds]);

    return { handleApply, appliedIds, handleSave, savedIds };
}
