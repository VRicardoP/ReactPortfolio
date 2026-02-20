import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';

const COLUMNS = [
    { key: 'saved', color: '#888888' },
    { key: 'applied', color: '#4CAF50' },
    { key: 'phone_screen', color: '#FF9800' },
    { key: 'technical', color: '#2196F3' },
    { key: 'offer', color: '#00BCD4' },
    { key: 'rejected', color: '#f44336' },
];

const INITIAL_NEW_APP = { title: '', company: '', url: '' };

const KanbanWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [applications, setApplications] = useState([]);
    const [draggedId, setDraggedId] = useState(null);
    const [addingTo, setAddingTo] = useState(null);
    const [newApp, setNewApp] = useState(INITIAL_NEW_APP);

    // Fetch applications on mount
    const fetchApplications = useCallback(async () => {
        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/`);
            const data = await response.json();
            setApplications(Array.isArray(data) ? data : data.results || data.data || []);
        } catch {
            setApplications([]);
        }
    }, [authenticatedFetch]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    // Drag handlers
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

        // Optimistic update
        const previousApps = [...applications];
        setApplications(prev =>
            prev.map(a => a.id === draggedId ? { ...a, status: targetStatus } : a)
        );
        setDraggedId(null);

        // Persist to backend
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/${draggedId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStatus }),
            });
        } catch {
            // Revert on failure
            setApplications(previousApps);
        }
    }, [draggedId, applications, authenticatedFetch]);

    // Add new application
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
            // Silently fail
        }
    }, [authenticatedFetch, newApp]);

    const handleNewAppChange = useCallback((field, value) => {
        setNewApp(prev => ({ ...prev, [field]: value }));
    }, []);

    // Group applications by status
    const grouped = {};
    COLUMNS.forEach(col => { grouped[col.key] = []; });
    applications.forEach(app => {
        const key = app.status || 'saved';
        if (grouped[key]) {
            grouped[key].push(app);
        } else {
            grouped.saved.push(app);
        }
    });

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${theme.border}`,
        color: theme.text,
        padding: '4px 6px',
        borderRadius: '3px',
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    };

    return (
        <FloatingWindow
            id="kanban-window"
            title={t('dashboard.kanban.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 900, height: 550 }}
        >
            <div style={{
                display: 'flex',
                gap: '6px',
                height: '100%',
                padding: '8px',
                overflowX: 'auto',
                fontFamily: 'Courier New, monospace',
            }}>
                {COLUMNS.map(col => (
                    <div
                        key={col.key}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.key)}
                        style={{
                            flex: '1 1 0',
                            minWidth: '130px',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '4px',
                            border: `1px solid ${theme.borderLight}`,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Column header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            background: `${col.color}22`,
                            borderBottom: `2px solid ${col.color}`,
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: col.color, textTransform: 'uppercase' }}>
                                {t(`dashboard.kanban.${col.key}`)}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: theme.text, opacity: 0.5 }}>
                                    {grouped[col.key].length}
                                </span>
                                <button
                                    onClick={() => setAddingTo(addingTo === col.key ? null : col.key)}
                                    style={{
                                        background: 'transparent',
                                        border: `1px solid ${col.color}55`,
                                        color: col.color,
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        lineHeight: '1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Inline add form */}
                        {addingTo === col.key && (
                            <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: `1px solid ${theme.borderLight}` }}>
                                <input
                                    type="text"
                                    placeholder={t('dashboard.kanban.titlePlaceholder')}
                                    value={newApp.title}
                                    onChange={(e) => handleNewAppChange('title', e.target.value)}
                                    style={inputStyle}
                                />
                                <input
                                    type="text"
                                    placeholder={t('dashboard.kanban.companyPlaceholder')}
                                    value={newApp.company}
                                    onChange={(e) => handleNewAppChange('company', e.target.value)}
                                    style={inputStyle}
                                />
                                <input
                                    type="text"
                                    placeholder={t('dashboard.kanban.urlPlaceholder')}
                                    value={newApp.url}
                                    onChange={(e) => handleNewAppChange('url', e.target.value)}
                                    style={inputStyle}
                                />
                                <button
                                    onClick={() => handleAdd(col.key)}
                                    disabled={!newApp.title.trim() || !newApp.company.trim()}
                                    style={{
                                        background: `${col.color}22`,
                                        border: `1px solid ${col.color}`,
                                        color: col.color,
                                        padding: '4px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontFamily: 'Courier New',
                                        fontSize: '11px',
                                    }}
                                >
                                    {t('dashboard.kanban.addCard')}
                                </button>
                            </div>
                        )}

                        {/* Cards */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {grouped[col.key].map(app => (
                                <div
                                    key={app.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                    style={{
                                        padding: '6px 8px',
                                        background: draggedId === app.id
                                            ? `rgba(${theme.primaryRgb}, 0.1)`
                                            : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${draggedId === app.id ? theme.primary : theme.borderLight}`,
                                        borderRadius: '3px',
                                        cursor: 'grab',
                                        transition: 'all 0.15s ease',
                                        opacity: draggedId === app.id ? 0.6 : 1,
                                    }}
                                >
                                    <div style={{ fontSize: '12px', color: theme.textHighlight, fontWeight: 'bold', marginBottom: '2px' }}>
                                        {app.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: theme.text, opacity: 0.8 }}>
                                        {app.company}
                                    </div>
                                    {app.source && (
                                        <span style={{
                                            display: 'inline-block',
                                            marginTop: '3px',
                                            padding: '1px 5px',
                                            borderRadius: '2px',
                                            fontSize: '9px',
                                            background: `rgba(${theme.primaryRgb}, 0.15)`,
                                            color: theme.primary,
                                            border: `1px solid rgba(${theme.primaryRgb}, 0.3)`,
                                        }}>
                                            {app.source}
                                        </span>
                                    )}
                                    {app.notes && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: theme.text,
                                            opacity: 0.5,
                                            marginTop: '3px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {app.notes}
                                        </div>
                                    )}
                                    {app.follow_up_date && (
                                        <div style={{ fontSize: '10px', color: theme.warning, marginTop: '3px' }}>
                                            {t('dashboard.kanban.followUp')}: {app.follow_up_date}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </FloatingWindow>
    );
});

KanbanWindow.displayName = 'KanbanWindow';

export default KanbanWindow;
