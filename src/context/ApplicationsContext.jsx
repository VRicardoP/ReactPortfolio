import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ADMIN_BACKEND_URL } from '../config/api';
import { useAuth } from './AuthContext';

const ApplicationsContext = createContext(null);

// Comparte las marcas y peticiones de ofertas entre todas las ventanas del dashboard.
// One provider owns deduplication so separate hook instances cannot issue duplicate POSTs.
export const ApplicationsProvider = ({ children }) => {
    const { authenticatedFetch } = useAuth();
    const [interestedIds, setInterestedIds] = useState(new Set());
    const [savedIds, setSavedIds] = useState(new Set());
    const [openedIds, setOpenedIds] = useState(new Set());
    const inFlightRef = useRef(new Set());

    // Registra una oferta una sola vez mientras exista una petición equivalente.
    // The shared in-flight key closes the race between different dashboard windows.
    const register = useCallback(async (job, status) => {
        const key = `${status}:${job.id}`;
        if (inFlightRef.current.has(key)) return false;
        inFlightRef.current.add(key);
        try {
            const response = await authenticatedFetch(`${ADMIN_BACKEND_URL}/api/v1/applications/`, {
                method: 'POST',
                body: JSON.stringify({
                    title: job.title || '',
                    company: job.company || '',
                    url: job.url || null,
                    source: job.source || null,
                    status,
                    description: job.description || null,
                }),
            });
            const created = await response.json();
            window.dispatchEvent(new CustomEvent('application-changed', { detail: created }));
            return true;
        } catch {
            return false;
        } finally {
            inFlightRef.current.delete(key);
        }
    }, [authenticatedFetch]);

    const handleInterested = useCallback(async (job) => {
        if (interestedIds.has(job.id)) return;
        if (await register(job, 'interested')) {
            setInterestedIds(previous => new Set(previous).add(job.id));
        }
    }, [interestedIds, register]);

    const handleSave = useCallback(async (job) => {
        if (savedIds.has(job.id)) return;
        if (await register(job, 'saved')) {
            setSavedIds(previous => new Set(previous).add(job.id));
        }
    }, [register, savedIds]);

    const handleOpenOffer = useCallback(async (job) => {
        if (job.url) window.open(job.url, '_blank', 'noopener,noreferrer');
        if (!openedIds.has(job.id) && !savedIds.has(job.id) && await register(job, 'saved')) {
            setSavedIds(previous => new Set(previous).add(job.id));
        }
        setOpenedIds(previous => new Set(previous).add(job.id));
    }, [openedIds, register, savedIds]);

    const value = useMemo(() => ({
        handleInterested,
        interestedIds,
        handleSave,
        savedIds,
        handleOpenOffer,
        openedIds,
    }), [handleInterested, interestedIds, handleSave, savedIds, handleOpenOffer, openedIds]);

    return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
};

// Da a cada ventana la misma vista y las mismas acciones sobre candidaturas.
// Consumers stay narrow while the provider supplies the shared ownership boundary.
// eslint-disable-next-line react-refresh/only-export-components
export const useApplications = () => {
    const context = useContext(ApplicationsContext);
    if (!context) throw new Error('useApplications must be used within ApplicationsProvider');
    return context;
};
