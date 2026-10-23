// Pestaña de "búsquedas guardadas": la lista de búsquedas favoritas, un
// formulario para crear una nueva, y los resultados de cada una se
// despliegan debajo al pulsarla. Solo dibuja la pantalla; toda la lógica
// vive en el hook useSavedSearches (recibido como `saved`).

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import JobCard from '../JobCard';

// Format filter summary for display (pure rendering helper)
// Convierte los filtros de una búsqueda guardada en un texto corto y legible.
const filterSummary = (t, filters) => {
    if (!filters) return '';
    const parts = [];
    if (filters.q) parts.push(filters.q);
    if (filters.country) parts.push(filters.country);
    if (filters.city) parts.push(filters.city);
    if (filters.salary_min || filters.salary_max) {
        const min = filters.salary_min ? `$${Number(filters.salary_min).toLocaleString()}` : '';
        const max = filters.salary_max ? `$${Number(filters.salary_max).toLocaleString()}` : '';
        parts.push(min && max ? `${min}-${max}` : min || `<=${max}`);
    }
    if (filters.remote_only) parts.push(t('dashboard.savedSearches.remote'));
    // Legacy
    if (filters.technologies?.length > 0) parts.push(filters.technologies.join(', '));
    return parts.join(' | ');
};

// Saved searches tab — stored searches with inline run/results (formerly SavedSearchesWindow).
// Purely presentational: state/logic lives in useSavedSearches (passed in as `saved`),
// apply tracking in useJobApplication (passed in as `jobApp`).
const SavedSearchesPanel = memo(({ saved, jobApp }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { handleOpenOffer, openedIds } = jobApp;

    const {
        searches, loading, showForm, setShowForm, formData, hasAnyFilter,
        handleFormChange, handleCreate, handleRun, handleDelete,
        expandedId, searchResults, searchLoading, resultsTotal,
    } = saved;

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Header with add button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="dash-label" style={{ fontSize: '12px' }}>
                    {searches.length} {t('dashboard.savedSearches.count')}
                </span>
                <button
                    className="dash-btn dash-btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? t('dashboard.savedSearches.cancel') : t('dashboard.savedSearches.add')}
                </button>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="dash-form-panel">
                    <input
                        type="text"
                        placeholder={t('dashboard.savedSearches.namePlaceholder')}
                        value={formData.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className="dash-input"
                    />
                    <div className="dash-form-grid">
                        <input
                            type="text"
                            placeholder={t('dashboard.savedSearches.queryPlaceholder')}
                            value={formData.q}
                            onChange={(e) => handleFormChange('q', e.target.value)}
                            className="dash-input"
                        />
                        <input
                            type="text"
                            placeholder={t('dashboard.savedSearches.countryPlaceholder')}
                            value={formData.country}
                            onChange={(e) => handleFormChange('country', e.target.value)}
                            className="dash-input"
                        />
                        <input
                            type="text"
                            placeholder={t('dashboard.savedSearches.cityPlaceholder')}
                            value={formData.city}
                            onChange={(e) => handleFormChange('city', e.target.value)}
                            className="dash-input"
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                                type="number"
                                placeholder={t('dashboard.savedSearches.salaryMinPH')}
                                value={formData.salaryMin}
                                onChange={(e) => handleFormChange('salaryMin', e.target.value)}
                                className="dash-input"
                                style={{ width: '50%' }}
                            />
                            <input
                                type="number"
                                placeholder={t('dashboard.savedSearches.salaryMaxPH')}
                                value={formData.salaryMax}
                                onChange={(e) => handleFormChange('salaryMax', e.target.value)}
                                className="dash-input"
                                style={{ width: '50%' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="dash-checkbox-row">
                            <input
                                type="checkbox"
                                checked={formData.remoteOnly}
                                onChange={(e) => handleFormChange('remoteOnly', e.target.checked)}
                            />
                            {t('dashboard.savedSearches.remoteOnly')}
                        </label>
                        <button
                            className="dash-btn dash-btn-primary"
                            onClick={handleCreate}
                            disabled={!formData.name.trim() && !hasAnyFilter}
                        >
                            {t('dashboard.savedSearches.save')}
                        </button>
                    </div>
                </div>
            )}

            {/* Search list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {loading && (
                    <div className="dash-status-text dash-status-text--accent">
                        {t('dashboard.savedSearches.loading')}
                    </div>
                )}

                {!loading && searches.length === 0 && (
                    <div className="dash-status-text dash-status-text--muted">
                        {t('dashboard.savedSearches.empty')}
                    </div>
                )}

                {searches.map(search => (
                    <div key={search.id}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                border: `1px solid ${expandedId === search.id ? theme.primary : theme.borderLight}`,
                                borderRadius: expandedId === search.id ? '4px 4px 0 0' : '4px',
                                background: expandedId === search.id
                                    ? `rgba(${theme.primaryRgb}, 0.05)`
                                    : 'rgba(255,255,255,0.02)',
                                transition: 'border-color 0.2s ease, background-color 0.2s ease',
                            }}
                        >
                            <div
                                role="button"
                                tabIndex={0}
                                aria-expanded={expandedId === search.id}
                                onClick={() => handleRun(search)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleRun(search);
                                    }
                                }}
                                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                            >
                                <div style={{
                                    fontFamily: 'Courier New',
                                    fontSize: '13px',
                                    color: theme.textHighlight,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {search.name}
                                </div>
                                <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.6, marginTop: '2px' }}>
                                    {filterSummary(t, search.filters)}
                                </div>
                            </div>

                            <button
                                className="dash-btn dash-btn-danger"
                                onClick={(e) => { e.stopPropagation(); handleDelete(search.id); }}
                            >
                                {t('dashboard.savedSearches.delete')}
                            </button>
                        </div>

                        {/* Inline results */}
                        {expandedId === search.id && (
                            <div style={{
                                border: `1px solid ${theme.primary}`,
                                borderTop: 'none',
                                borderRadius: '0 0 4px 4px',
                                padding: '8px',
                                background: 'rgba(255,255,255,0.01)',
                                maxHeight: '250px',
                                overflowY: 'auto',
                            }}>
                                {searchLoading && (
                                    <div className="dash-status-text dash-status-text--accent" style={{ padding: '10px', fontSize: '11px' }}>
                                        {t('dashboard.savedSearches.searching')}
                                    </div>
                                )}
                                {!searchLoading && searchResults.length === 0 && (
                                    <div className="dash-status-text dash-status-text--muted" style={{ padding: '10px', fontSize: '11px' }}>
                                        {t('dashboard.savedSearches.noResults')}
                                    </div>
                                )}
                                {!searchLoading && searchResults.length > 0 && (
                                    <div className="dash-label" style={{ marginBottom: '6px' }}>
                                        {resultsTotal} {t('dashboard.savedSearches.resultsFound')}
                                    </div>
                                )}
                                {searchResults.map(job => (
                                    <JobCard
                                        key={`${job.source}-${job.id}`}
                                        job={job}
                                        variant="saved"
                                        actions={job.url && (
                                            <button
                                                onClick={(event) => { event.stopPropagation(); handleOpenOffer(job); }}
                                                className={`jobboard-apply-btn ${openedIds.has(job.id) ? 'applied' : ''}`}
                                                style={{ padding: '2px 8px', fontSize: '10px' }}
                                            >
                                                {openedIds.has(job.id)
                                                    ? t('dashboard.jobBoard.opened')
                                                    : t('dashboard.jobBoard.viewOffer')}
                                            </button>
                                        )}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

SavedSearchesPanel.displayName = 'SavedSearchesPanel';

export default SavedSearchesPanel;
