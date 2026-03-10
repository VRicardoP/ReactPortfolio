import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import useKanban from '../../hooks/useKanban';
import '../../styles/kanban.css';

const COLUMNS = [
    { key: 'saved', i18nKey: 'saved', color: '#888888' },
    { key: 'applied', i18nKey: 'applied', color: '#4CAF50' },
    { key: 'phone_screen', i18nKey: 'phoneScreen', color: '#FF9800' },
    { key: 'technical', i18nKey: 'technical', color: '#2196F3' },
    { key: 'offer', i18nKey: 'offer', color: '#00BCD4' },
    { key: 'rejected', i18nKey: 'rejected', color: '#f44336' },
];

const DRAGGED_OPACITY = 0.6;

const KanbanBoard = memo(({
    documentMap,
    generatingIds,
    onGenerate,
    onViewDocuments,
    onDownloadPdf,
    onDelete,
}) => {
    const { t } = useTranslation();
    const { theme } = useTheme();

    const {
        draggedId,
        addingTo,
        setAddingTo,
        newApp,
        grouped,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleAdd,
        handleNewAppChange,
        handleMoveCard,
        handleDelete,
        handleMarkApplied,
    } = useKanban();

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
                            {t(`dashboard.kanban.${col.i18nKey}`)}
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

                                    {/* Icon action buttons — all 5 always visible */}
                                    <div className="kanban-card-actions kanban-icon-actions">
                                        {/* 1. Generate / View docs */}
                                        <button
                                            className="kanban-icon-btn"
                                            aria-label={hasDocs ? t('dashboard.kanban.viewDocs') : t('dashboard.kanban.generateDocs')}
                                            title={hasDocs ? t('dashboard.kanban.viewDocs') : t('dashboard.kanban.generateDocs')}
                                            disabled={isGenerating}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                hasDocs ? onViewDocuments(app.id) : onGenerate(app.id);
                                            }}
                                        >
                                            {isGenerating ? '⏳' : hasDocs ? '📋' : '⚡'}
                                        </button>
                                        {/* 2. Download docs */}
                                        <button
                                            className="kanban-icon-btn"
                                            aria-label={t('dashboard.kanban.downloadDocs')}
                                            title={t('dashboard.kanban.downloadDocs')}
                                            disabled={!hasDocs}
                                            onClick={(e) => { e.stopPropagation(); onDownloadPdf(app.id); }}
                                        >
                                            ⬇
                                        </button>
                                        {/* 3. Open URL (does NOT move to applied) */}
                                        <a
                                            href={app.url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`kanban-icon-btn${!app.url ? ' disabled' : ''}`}
                                            aria-label={t('dashboard.kanban.openUrl')}
                                            title={t('dashboard.kanban.openUrl')}
                                            aria-disabled={!app.url}
                                            tabIndex={app.url ? 0 : -1}
                                            onClick={(e) => { e.stopPropagation(); if (!app.url) e.preventDefault(); }}
                                        >
                                            🔗
                                        </a>
                                        {/* 4. Mark as applied */}
                                        <button
                                            className="kanban-icon-btn kanban-icon-applied"
                                            aria-label={t('dashboard.kanban.markApplied')}
                                            title={t('dashboard.kanban.markApplied')}
                                            disabled={app.status === 'applied'}
                                            onClick={(e) => { e.stopPropagation(); handleMarkApplied(app.id); }}
                                        >
                                            ✓
                                        </button>
                                        {/* 5. Delete */}
                                        <button
                                            className="kanban-icon-btn kanban-icon-delete"
                                            aria-label={t('dashboard.kanban.deleteApp')}
                                            title={t('dashboard.kanban.deleteApp')}
                                            onClick={(e) => { e.stopPropagation(); handleDelete(app.id); onDelete?.(app.id); }}
                                        >
                                            ✕
                                        </button>
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
