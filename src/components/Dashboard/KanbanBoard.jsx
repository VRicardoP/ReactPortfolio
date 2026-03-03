import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';
import { showToast } from '../UI/Toast';
import '../../styles/kanban.css';

const COLUMNS = [
    { key: 'saved', color: '#888888' },
    { key: 'applied', color: '#4CAF50' },
    { key: 'phone_screen', color: '#FF9800' },
    { key: 'technical', color: '#2196F3' },
    { key: 'offer', color: '#00BCD4' },
    { key: 'rejected', color: '#f44336' },
];

const INITIAL_NEW_APP = { title: '', company: '', url: '' };

const DRAGGED_OPACITY = 0.6;

const KanbanBoard = memo(({
    documentMap,
    generatingIds,
    onGenerate,
    onViewDocuments,
}) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [applications, setApplications] = useState([]);
    const [draggedId, setDraggedId] = useState(null);
    const [addingTo, setAddingTo] = useState(null);
    const [newApp, setNewApp] = useState(INITIAL_NEW_APP);

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

        const colIndex = COLUMNS.findIndex(c => c.key === app.status);
        const targetIndex = colIndex + direction;
        if (targetIndex < 0 || targetIndex >= COLUMNS.length) return;

        const targetStatus = COLUMNS[targetIndex].key;
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

    return (
        <div className="kanban-board">
            {COLUMNS.map((col, colIndex) => (
                <div
                    key={col.key}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.key)}
                    className="kanban-column"
                    style={{ borderColor: theme.borderLight }}
                >
                    {/* Column header */}
                    <div
                        className="kanban-column-header"
                        style={{
                            background: `${col.color}22`,
                            borderBottom: `2px solid ${col.color}`,
                        }}
                    >
                        <span className="kanban-column-title" style={{ color: col.color }}>
                            {t(`dashboard.kanban.${col.key}`)}
                        </span>
                        <div className="kanban-column-actions">
                            <span className="kanban-count" style={{ color: theme.text }}>
                                {grouped[col.key].length}
                            </span>
                            <button
                                onClick={() => setAddingTo(addingTo === col.key ? null : col.key)}
                                className="kanban-add-btn"
                                aria-label={t('dashboard.kanban.addApplication')}
                                style={{
                                    borderColor: `${col.color}55`,
                                    color: col.color,
                                }}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Inline add form */}
                    {addingTo === col.key && (
                        <div
                            className="kanban-add-form"
                            style={{ borderBottom: `1px solid ${theme.borderLight}` }}
                        >
                            <input
                                type="text"
                                placeholder={t('dashboard.kanban.titlePlaceholder')}
                                value={newApp.title}
                                onChange={(e) => handleNewAppChange('title', e.target.value)}
                                className="kanban-input"
                                style={{ borderColor: theme.border, color: theme.text }}
                            />
                            <input
                                type="text"
                                placeholder={t('dashboard.kanban.companyPlaceholder')}
                                value={newApp.company}
                                onChange={(e) => handleNewAppChange('company', e.target.value)}
                                className="kanban-input"
                                style={{ borderColor: theme.border, color: theme.text }}
                            />
                            <input
                                type="text"
                                placeholder={t('dashboard.kanban.urlPlaceholder')}
                                value={newApp.url}
                                onChange={(e) => handleNewAppChange('url', e.target.value)}
                                className="kanban-input"
                                style={{ borderColor: theme.border, color: theme.text }}
                            />
                            <button
                                onClick={() => handleAdd(col.key)}
                                disabled={!newApp.title.trim() || !newApp.company.trim()}
                                className="kanban-add-form-submit"
                                style={{
                                    background: `${col.color}22`,
                                    borderColor: col.color,
                                    color: col.color,
                                }}
                            >
                                {t('dashboard.kanban.addCard')}
                            </button>
                        </div>
                    )}

                    {/* Cards */}
                    <div className="kanban-cards-container">
                        {grouped[col.key].map(app => {
                            const hasDocs = !!documentMap?.[app.id];
                            const isGenerating = generatingIds?.has(app.id);
                            const isDragged = draggedId === app.id;

                            return (
                                <div
                                    key={app.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                    className="kanban-card"
                                    style={{
                                        background: isDragged
                                            ? `rgba(${theme.primaryRgb}, 0.1)`
                                            : 'rgba(255,255,255,0.03)',
                                        borderColor: isDragged ? theme.primary : theme.borderLight,
                                        opacity: isDragged ? DRAGGED_OPACITY : 1,
                                    }}
                                >
                                    <div className="kanban-card-title" style={{ color: theme.textHighlight }}>
                                        {app.title}
                                    </div>
                                    <div className="kanban-card-company" style={{ color: theme.text }}>
                                        {app.company}
                                    </div>
                                    {app.source && (
                                        <span
                                            className="kanban-source-badge"
                                            style={{
                                                background: `rgba(${theme.primaryRgb}, 0.15)`,
                                                color: theme.primary,
                                                borderColor: `rgba(${theme.primaryRgb}, 0.3)`,
                                            }}
                                        >
                                            {app.source}
                                        </span>
                                    )}
                                    {app.notes && (
                                        <div className="kanban-notes" style={{ color: theme.text }}>
                                            {app.notes}
                                        </div>
                                    )}
                                    {app.follow_up_date && (
                                        <div className="kanban-follow-up" style={{ color: theme.warning }}>
                                            {t('dashboard.kanban.followUp')}: {app.follow_up_date}
                                        </div>
                                    )}

                                    {/* Keyboard move buttons (visible on focus-within) */}
                                    <div className="kanban-move-btns">
                                        {colIndex > 0 && (
                                            <button
                                                className="kanban-move-btn"
                                                aria-label={t('dashboard.kanban.moveLeft')}
                                                onClick={(e) => { e.stopPropagation(); handleMoveCard(app.id, -1); }}
                                            >
                                                ◀
                                            </button>
                                        )}
                                        {colIndex < COLUMNS.length - 1 && (
                                            <button
                                                className="kanban-move-btn"
                                                aria-label={t('dashboard.kanban.moveRight')}
                                                onClick={(e) => { e.stopPropagation(); handleMoveCard(app.id, 1); }}
                                            >
                                                ▶
                                            </button>
                                        )}
                                    </div>

                                    {/* Document action buttons */}
                                    <div className="kanban-card-actions cv-gen-actions">
                                        {hasDocs ? (
                                            <button
                                                className="cv-gen-btn cv-gen-btn-view"
                                                onClick={(e) => { e.stopPropagation(); onViewDocuments(app.id); }}
                                            >
                                                {t('dashboard.cvGeneration.viewDocs')}
                                            </button>
                                        ) : (
                                            <button
                                                className="cv-gen-btn cv-gen-btn-generate"
                                                disabled={isGenerating}
                                                onClick={(e) => { e.stopPropagation(); onGenerate(app.id); }}
                                            >
                                                {isGenerating
                                                    ? t('dashboard.cvGeneration.generating')
                                                    : t('dashboard.cvGeneration.generate')
                                                }
                                            </button>
                                        )}
                                        {app.url && (
                                            <a
                                                href={app.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="cv-gen-btn cv-gen-btn-applied"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {t('dashboard.jobBoard.apply')}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
});

KanbanBoard.displayName = 'KanbanBoard';

export default KanbanBoard;
