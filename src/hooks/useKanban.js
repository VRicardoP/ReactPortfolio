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

    // Vuelos POR TARJETA. La generacion decide QUIEN puede revertir: sobre la
    // MISMA tarjeta dos movimientos se solapan (pulsar la flecha dos veces
    // seguidas es uso normal) y el fallo tardio del primero pisaba el segundo,
    // que el servidor ya habia aceptado.
    // El `baseline` decide A DONDE: es el ultimo estado CONFIRMADO por el
    // servidor. Revertir al estado del render dejaba la vista por delante —a
    // partir del segundo movimiento ese estado ya es optimista y nunca se
    // persistio, asi que con el backend caido dos flechas dejaban la tarjeta
    // una columna por delante del servidor, y tres, dos columnas.
    // Y el CIERRE del ultimo vuelo decide CUANDO: leer el ancla en el instante
    // del fallo la dejaba por detras (ver `beginMutation.end`). Las dos
    // direcciones se miden en `useKanban.test.js` (G10-K1..K5, G11-K1..K3).
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
     * Registra una mutacion de `id` hacia `targetStatus` y devuelve su control
     * de vuelo: `isCurrent` (solo la ultima lanzada sobre la tarjeta cuenta),
     * `fail` (anotar que fracaso), `confirm` (el servidor acepto este destino) y
     * `end` (cerrar el vuelo, y reconciliar la vista si era el ultimo).
     */
    const beginMutation = useCallback((id, currentStatus, targetStatus) => {
        const flights = flightsRef.current;
        const flight = flights[id]
            || (flights[id] = {
                generation: 0, confirmed: 0, inFlight: 0, failed: 0, baseline: currentStatus,
            });
        // Sin vuelos abiertos, lo que se ve ES lo que el servidor confirmo.
        if (flight.inFlight === 0) flight.baseline = currentStatus;
        flight.inFlight += 1;
        const generation = (flight.generation += 1);

        return {
            isCurrent: () => flight.generation === generation,
            // Se ANOTA el fallo; NO se revierte todavia. Revertir aqui era leer
            // el ancla en el momento del fallo, y el ancla aun no habia recogido
            // las confirmaciones de los PATCH anteriores que seguian volando: si
            // el ultimo fallaba ANTES de que triunfase el primero, la vista se
            // quedaba por DETRAS del servidor, en silencio, y la siguiente
            // flecha mandaba un PATCH que DESTRUIA el estado bueno.
            fail: () => { flight.failed = generation; },
            confirm: () => {
                // Un PATCH viejo que responde tarde no adelanta el ancla.
                if (generation <= flight.confirmed) return;
                flight.confirmed = generation;
                flight.baseline = targetStatus;
            },
            end: () => {
                flight.inFlight -= 1;
                if (flight.inFlight > 0) return;
                // Cerrado el ULTIMO vuelo, el ancla ya recogio todas las
                // confirmaciones: es el unico instante en que se sabe donde esta
                // el servidor de verdad. Se reconcilia solo si el movimiento que
                // el usuario pidio el ultimo fracaso; si lo superó otro
                // posterior, la vista ya muestra el destino de ese.
                const reconciliar = flight.failed === flight.generation;
                const destino = flight.baseline;
                delete flights[id];
                if (reconciliar) revertStatus(id, destino);
            },
        };
    }, [revertStatus]);

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

        const flight = beginMutation(draggedId, app.status, targetStatus);
        setApplications(prev =>
            prev.map(a => a.id === draggedId ? { ...a, status: targetStatus } : a)
        );
        setDraggedId(null);

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${draggedId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStatus }),
            });
            flight.confirm();
        } catch {
            if (flight.isCurrent()) {
                flight.fail();
                showToast(t('dashboard.kanban.errorMove'));
            }
        } finally {
            flight.end();
        }
    }, [draggedId, applications, authenticatedFetch, beginMutation, t]);

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

        const targetStatus = COLUMN_KEYS[targetIndex];
        const flight = beginMutation(appId, app.status, targetStatus);
        setApplications(prev =>
            prev.map(a => a.id === appId ? { ...a, status: targetStatus } : a)
        );

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${appId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStatus }),
            });
            flight.confirm();
        } catch {
            // Superado por un movimiento posterior de ESTA tarjeta que el
            // servidor si acepto: revertir mentiria, y el aviso tambien.
            if (flight.isCurrent()) {
                flight.fail();
                showToast(t('dashboard.kanban.errorMove'));
            }
        } finally {
            flight.end();
        }
    }, [applications, authenticatedFetch, beginMutation, t]);

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

        const flight = beginMutation(appId, app.status, 'applied');
        setApplications(prev =>
            prev.map(a => a.id === appId ? { ...a, status: 'applied' } : a)
        );
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${appId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'applied' }),
            });
            flight.confirm();
        } catch {
            if (flight.isCurrent()) {
                flight.fail();
                showToast(t('dashboard.kanban.errorMove'));
            }
        } finally {
            flight.end();
        }
    }, [applications, authenticatedFetch, beginMutation, t]);

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
