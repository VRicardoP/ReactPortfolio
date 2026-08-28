import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';

const INITIAL_NEW_APP = { title: '', company: '', url: '' };

/** Column keys in pipeline order (rendering metadata like colors lives in the component). */
export const COLUMN_KEYS = [
    'saved',
    'applied',
    'phone_screen',
    'technical',
    'offer',
    'rejected',
];

/**
 * Kanban pipeline state management and CRUD.
 * Handles applications fetch, drag-and-drop, card creation,
 * and keyboard-based column moves. Used by KanbanBoard.
 */
const useKanban = () => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();

    const [applications, setApplications] = useState([]);
    const [draggedId, setDraggedId] = useState(null);
    const [addingTo, setAddingTo] = useState(null);
    const [newApp, setNewApp] = useState(INITIAL_NEW_APP);

    // UN SOLO PATCH en vuelo por tarjeta.
    //
    // El PATCH de estado es ABSOLUTO ("ponla en `applied`"), asi que con dos en
    // vuelo manda el orden en que el SERVIDOR los procesa, y ese orden el
    // cliente no lo conoce ni lo puede inferir: si la red entrega antes el
    // segundo, la base termina en el destino del primero mientras la vista
    // muestra el del segundo. Ningun contador local arregla eso —lo intentaron
    // las generaciones que habia aqui—, porque miden el orden de SALIDA.
    //
    // Por eso los movimientos que llegan mientras vuela uno se COALESCEN: se
    // aplican al momento en la vista (pulsar la flecha dos veces seguidas es
    // uso normal) y, al confirmar el PATCH en curso, sale UNO solo hacia el
    // ultimo destino que el usuario pidio. El servidor ve exactamente la misma
    // secuencia que la vista, en el mismo orden.
    //
    // `baseline` es el ultimo destino que el servidor CONFIRMO: es a donde se
    // revierte si el PATCH fracasa —ni al estado del render, que ya es
    // optimista y dejaria la vista por delante, ni al inicial, que la dejaria
    // por detras de lo ya persistido.
    //
    // COTA CONOCIDA: esto ordena los PATCH de ESTA pestana. Dos pestanas (o dos
    // clientes) sobre la misma tarjeta pueden seguir divergiendo; cerrar eso
    // exige version/ETag en el servidor, no mas estado local.
    const flightsRef = useRef({});

    // Fetch all applications on mount
    const fetchApplications = useCallback(async () => {
        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/`);
            const data = await response.json();
            setApplications(Array.isArray(data) ? data : data.results || data.data || []);
        } catch {
            setApplications([]);
            showToast(t('dashboard.kanban.errorLoad'));
        }
    }, [authenticatedFetch, t]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    // Listen for saves/applies from other windows (e.g. AIJobMatchWindow)
    useEffect(() => {
        const handleExternalChange = (e) => {
            const app = e.detail;
            if (app?.id) {
                setApplications(prev => {
                    if (prev.some(a => a.id === app.id)) return prev;
                    return [...prev, app];
                });
            }
        };
        window.addEventListener('application-changed', handleExternalChange);
        return () => window.removeEventListener('application-changed', handleExternalChange);
    }, []);

    // Rollback quirurgico: devuelve UNA tarjeta a su estado previo sin tocar el
    // resto. Restaurar la instantanea completa (el codigo anterior) borraba los
    // movimientos que hubieran tenido exito mientras volaba este PATCH.
    const revertStatus = useCallback((id, status) => {
        setApplications(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
    }, []);

    /**
     * Mueve la tarjeta en la vista y manda su PATCH; si esa tarjeta ya tenia
     * uno en vuelo, el destino se COALESCE en la cola en vez de salir a la vez.
     *
     * @param {number} id tarjeta
     * @param {string} currentStatus estado visible, que sin vuelos abiertos ES
     *                 el que el servidor confirmo
     * @param {string} targetStatus destino pedido
     * @returns {Promise<void>} se cumple cuando la cola de la tarjeta se vacia
     */
    const mutateStatus = useCallback((id, currentStatus, targetStatus) => {
        setApplications(prev =>
            prev.map(a => (a.id === id ? { ...a, status: targetStatus } : a))
        );

        const flights = flightsRef.current;
        const enCurso = flights[id];
        if (enCurso) {
            // Solo cuenta el ULTIMO destino pedido: los intermedios ya no los
            // quiere nadie, y mandarlos solo multiplicaria los PATCH.
            enCurso.pending = targetStatus;
            return enCurso.drained;
        }

        const flight = { pending: targetStatus, baseline: currentStatus, drained: null };
        flights[id] = flight;
        flight.drained = (async () => {
            let failed = false;
            while (flight.pending !== null && !failed) {
                const destino = flight.pending;
                flight.pending = null;
                try {
                    await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ status: destino }),
                    });
                    flight.baseline = destino;
                } catch {
                    // Se abandona la cola: los destinos pendientes se calcularon
                    // sobre un movimiento que NO se persistio.
                    failed = true;
                }
            }
            delete flights[id];
            if (failed) {
                revertStatus(id, flight.baseline);
                showToast(t('dashboard.kanban.errorMove'));
            }
        })();
        return flight.drained;
    }, [authenticatedFetch, revertStatus, t]);

    const handleDragStart = useCallback((e, id) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(async (e, targetStatus) => {
        e.preventDefault();
        if (!draggedId) return;

        const app = applications.find(a => a.id === draggedId);
        if (!app || app.status === targetStatus) {
            setDraggedId(null);
            return;
        }

        setDraggedId(null);
        await mutateStatus(draggedId, app.status, targetStatus);
    }, [draggedId, applications, mutateStatus]);

    const handleAdd = useCallback(async (status) => {
        if (!newApp.title.trim() || !newApp.company.trim()) return;

        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/`, {
                method: 'POST',
                body: JSON.stringify({
                    title: newApp.title.trim(),
                    company: newApp.company.trim(),
                    url: newApp.url.trim() || null,
                    status,
                }),
            });
            const created = await response.json();
            setApplications(prev => [...prev, created]);
            setNewApp(INITIAL_NEW_APP);
            setAddingTo(null);
        } catch {
            showToast(t('dashboard.kanban.errorAdd'));
        }
    }, [authenticatedFetch, newApp, t]);

    const handleNewAppChange = useCallback((field, value) => {
        setNewApp(prev => ({ ...prev, [field]: value }));
    }, []);

    // Keyboard: move card to adjacent column
    const handleMoveCard = useCallback(async (appId, direction) => {
        const app = applications.find(a => a.id === appId);
        if (!app) return;

        const colIndex = COLUMN_KEYS.indexOf(app.status);
        const targetIndex = colIndex + direction;
        if (targetIndex < 0 || targetIndex >= COLUMN_KEYS.length) return;

        await mutateStatus(appId, app.status, COLUMN_KEYS[targetIndex]);
    }, [applications, mutateStatus]);

    // Delete an application from the pipeline
    const handleDelete = useCallback(async (appId) => {
        // Mismo criterio quirurgico: si el DELETE falla, reinsertar SOLO la
        // tarjeta borrada y en su sitio, sin revertir lo que haya pasado entretanto.
        const index = applications.findIndex(a => a.id === appId);
        const removed = index === -1 ? null : applications[index];
        setApplications(prev => prev.filter(a => a.id !== appId));
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${appId}`, {
                method: 'DELETE',
            });
        } catch {
            if (removed) {
                setApplications(prev => {
                    const next = [...prev];
                    next.splice(Math.min(index, next.length), 0, removed);
                    return next;
                });
            }
            showToast(t('dashboard.kanban.errorDelete'));
        }
    }, [applications, authenticatedFetch, t]);

    // Mark a card as "applied" status
    const handleMarkApplied = useCallback(async (appId) => {
        const app = applications.find(a => a.id === appId);
        if (!app || app.status === 'applied') return;

        await mutateStatus(appId, app.status, 'applied');
    }, [applications, mutateStatus]);

    // Group applications by status
    const grouped = useMemo(() => {
        const groups = {};
        COLUMN_KEYS.forEach(key => { groups[key] = []; });
        applications.forEach(app => {
            const key = app.status || 'saved';
            if (groups[key]) {
                groups[key].push(app);
            } else {
                groups.saved.push(app);
            }
        });
        return groups;
    }, [applications]);

    return {
        applications,
        draggedId,
        addingTo,
        setAddingTo,
        newApp,
        grouped,
        fetchApplications,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleAdd,
        handleNewAppChange,
        handleMoveCard,
        handleDelete,
        handleMarkApplied,
    };
};

export default useKanban;
