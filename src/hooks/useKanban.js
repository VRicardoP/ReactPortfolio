import { useState, useCallback, useEffect, useMemo } from 'react';
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

        const previousApps = [...applications];
        setApplications(prev =>
            prev.map(a => a.id === draggedId ? { ...a, status: targetStatus } : a)
        );
        setDraggedId(null);

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${draggedId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStatus }),
            });
        } catch {
            setApplications(previousApps);
            showToast(t('dashboard.kanban.errorMove'));
        }
    }, [draggedId, applications, authenticatedFetch, t]);

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
        const previousApps = [...applications];
        setApplications(prev =>
            prev.map(a => a.id === appId ? { ...a, status: targetStatus } : a)
        );

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${appId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStatus }),
            });
        } catch {
            setApplications(previousApps);
            showToast(t('dashboard.kanban.errorMove'));
        }
    }, [applications, authenticatedFetch, t]);

    // Delete an application from the pipeline
    const handleDelete = useCallback(async (appId) => {
        const previousApps = [...applications];
        setApplications(prev => prev.filter(a => a.id !== appId));
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${appId}`, {
                method: 'DELETE',
            });
        } catch {
            setApplications(previousApps);
            showToast(t('dashboard.kanban.errorDelete'));
        }
    }, [applications, authenticatedFetch, t]);

    // Mark a card as "applied" status
    const handleMarkApplied = useCallback(async (appId) => {
        const app = applications.find(a => a.id === appId);
        if (!app || app.status === 'applied') return;

        const previousApps = [...applications];
        setApplications(prev =>
            prev.map(a => a.id === appId ? { ...a, status: 'applied' } : a)
        );
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${appId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'applied' }),
            });
        } catch {
            setApplications(previousApps);
            showToast(t('dashboard.kanban.errorMove'));
        }
    }, [applications, authenticatedFetch, t]);

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
