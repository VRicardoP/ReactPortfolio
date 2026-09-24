import { useState, useCallback, useRef } from 'react';
import { BACKEND_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

/**
 * Acciones sobre una oferta del panel. Tres, y cada una dice la verdad:
 *
 * - `handleInterested` — marca ligera «me interesa». No existía: el enum del
 *   backend no tenía ese estado, así que el botón tampoco.
 * - `handleSave` — la guarda para revisarla.
 * - `handleOpenOffer` — ABRE la oferta en otra pestaña y la guarda.
 *
 * Lo que este hook YA NO hace: dar por aplicada una oferta sólo porque se
 * abrió su página. `handleApply` abría la URL y a la vez registraba
 * `status: 'applied'`, así que el panel mostraba como aplicadas ofertas a las
 * que nadie había aplicado. Abrir una oferta es mirarla, no postular: quien
 * aplica de verdad lo marca en el Kanban, que para eso tiene su columna.
 *
 * Deduplica por id para no crear la misma candidatura dos veces.
 */
export default function useJobApplication() {
    const { authenticatedFetch } = useAuth();
    const [interestedIds, setInterestedIds] = useState(new Set());
    const [savedIds, setSavedIds] = useState(new Set());
    const [openedIds, setOpenedIds] = useState(new Set());
    const enCursoRef = useRef(new Set());

    // Registra la oferta con el estado pedido. Devuelve true si quedó anotada.
    const registrar = useCallback(async (job, status) => {
        const clave = `${status}:${job.id}`;
        if (enCursoRef.current.has(clave)) return false;
        enCursoRef.current.add(clave);
        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/`, {
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
            if (!response.ok) return false;
            const created = await response.json();
            window.dispatchEvent(new CustomEvent('application-changed', { detail: created }));
            return true;
        } catch {
            return false;
        } finally {
            enCursoRef.current.delete(clave);
        }
    }, [authenticatedFetch]);

    const handleInterested = useCallback(async (job) => {
        if (interestedIds.has(job.id)) return;
        if (await registrar(job, 'interested')) {
            setInterestedIds(prev => new Set(prev).add(job.id));
        }
    }, [registrar, interestedIds]);

    const handleSave = useCallback(async (job) => {
        if (savedIds.has(job.id)) return;
        if (await registrar(job, 'saved')) {
            setSavedIds(prev => new Set(prev).add(job.id));
        }
    }, [registrar, savedIds]);

    const handleOpenOffer = useCallback(async (job) => {
        if (job.url) {
            window.open(job.url, '_blank', 'noopener,noreferrer');
        }
        // Se guarda para no perderla de vista, NUNCA como aplicada: abrir la
        // pagina de una oferta no es haber postulado a ella.
        if (!openedIds.has(job.id) && !savedIds.has(job.id)) {
            if (await registrar(job, 'saved')) {
                setSavedIds(prev => new Set(prev).add(job.id));
            }
        }
        setOpenedIds(prev => new Set(prev).add(job.id));
    }, [registrar, openedIds, savedIds]);

    return {
        handleInterested, interestedIds,
        handleSave, savedIds,
        handleOpenOffer, openedIds,
    };
}
