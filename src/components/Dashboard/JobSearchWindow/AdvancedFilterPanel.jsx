// Pestaña de "filtro avanzado": un formulario con varios campos (texto,
// país, ciudad, salario, remoto) y la lista de resultados con botón de
// "cargar más". Solo dibuja la pantalla; toda la lógica vive en el hook
// useJobFilter (recibido como `filter`).

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import JobCard from '../JobCard';

// Advanced filter tab — multi-field aggregated search (formerly JobFilterWindow).
// Purely presentational: filter state/logic lives in useJobFilter (passed in as `filter`),
// apply tracking in useJobApplication (passed in as `jobApp`).
// NOTE: the "Save search" button is intentionally absent. In the original window it rendered
// only when an `onSaveSearch` callback was supplied, which never happened — so it was always
// inert. Behavior is preserved (no visible button); the dead wiring is not resurrected here.
const AdvancedFilterPanel = memo(({ filter, jobApp }) => {
    const { t } = useTranslation();
    const { handleOpenOffer, openedIds } = jobApp;

    const {
        filters, results, total, hasMore, loading, searched, hasFilters,
        handleFilterChange, handleSearch, handleLoadMore, handleClear, formatSalary,
    } = filter;

    // Single pagination contract (local offset engine AND core keyset feed):
    // `total` is null when the backend cannot count the corpus (cursor mode) —
    // show what we have, with a "+" while more pages exist.
    // Calcula el texto de "cuántos resultados hay": el número exacto si se
    // conoce, o "lo que hay cargado + un símbolo +" si no se puede contar el total.
    const resultCountLabel = total != null
        ? `${total}`
        : `${results.length}${hasMore ? '+' : ''}`;

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Filter form */}
            <div className="dash-form-grid" style={{ padding: '8px' }}>
                <div>
                    <label className="dash-label">
                        {t('dashboard.jobFilter.searchLabel')}
                    </label>
                    <input
                        type="text"
                        placeholder={t('dashboard.jobFilter.searchPlaceholder')}
                        value={filters.q}
                        onChange={(e) => handleFilterChange('q', e.target.value)}
                        className="dash-input"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <div>
                    <label className="dash-label">
                        {t('dashboard.jobFilter.countryLabel')}
                    </label>
                    <input
                        type="text"
                        placeholder={t('dashboard.jobFilter.countryPlaceholder')}
                        value={filters.country}
                        onChange={(e) => handleFilterChange('country', e.target.value)}
                        className="dash-input"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <div>
                    <label className="dash-label">
                        {t('dashboard.jobFilter.cityLabel')}
                    </label>
                    <input
                        type="text"
                        placeholder={t('dashboard.jobFilter.cityPlaceholder')}
                        value={filters.city}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                        className="dash-input"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{ flex: 1 }}>
                        <label className="dash-label">
                            {t('dashboard.jobFilter.salaryMin')}
                        </label>
                        <input
                            type="number"
                            placeholder="0"
                            value={filters.salaryMin}
                            onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
                            className="dash-input"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="dash-label">
                            {t('dashboard.jobFilter.salaryMax')}
                        </label>
                        <input
                            type="number"
                            placeholder="999999"
                            value={filters.salaryMax}
                            onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
                            className="dash-input"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                    <label className="dash-checkbox-row">
                        <input
                            type="checkbox"
                            checked={filters.remoteOnly}
                            onChange={(e) => handleFilterChange('remoteOnly', e.target.checked)}
                        />
                        {t('dashboard.jobFilter.remoteOnly')}
                    </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'end', gap: '6px', justifyContent: 'flex-end' }}>
                    <button className="dash-btn dash-btn-primary dash-btn-lg" onClick={() => handleSearch()}>
                        {t('dashboard.jobFilter.search')}
                    </button>
                    {hasFilters && (
                        <button className="dash-btn dash-btn-lg" onClick={handleClear}>
                            {t('dashboard.jobFilter.clear')}
                        </button>
                    )}
                </div>
            </div>

            {/* Results header */}
            {searched && (
                <div className="dash-label" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '11px',
                }}>
                    <span>
                        {loading
                            ? t('dashboard.jobFilter.searching')
                            : `${resultCountLabel} ${t('dashboard.jobFilter.resultsFound')}`
                        }
                    </span>
                </div>
            )}

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!searched && (
                    <div className="dash-status-text dash-status-text--muted" style={{ padding: '30px 20px' }}>
                        {t('dashboard.jobFilter.hint')}
                    </div>
                )}

                {searched && !loading && results.length === 0 && (
                    <div className="dash-status-text dash-status-text--muted" style={{ padding: '30px 20px' }}>
                        {t('dashboard.jobFilter.noResults')}
                    </div>
                )}

                {results.map(job => (
                    <JobCard
                        key={`${job.source}-${job.id}`}
                        job={job}
                        variant="filter"
                        formatSalary={formatSalary}
                        actions={job.url && (
                            <button
                                onClick={() => handleOpenOffer(job)}
                                className={`jobboard-apply-btn ${openedIds.has(job.id) ? 'applied' : ''}`}
                            >
                                {openedIds.has(job.id)
                                    ? t('dashboard.jobBoard.opened')
                                    : t('dashboard.jobBoard.viewOffer')}
                            </button>
                        )}
                    />
                ))}

                {/* "Load more": follows next_cursor (core) or accumulated
                    offset (local) via handleLoadMore — never a page total. */}
                {searched && hasMore && (
                    <button
                        className="dash-btn"
                        onClick={handleLoadMore}
                        disabled={loading}
                        style={{ alignSelf: 'center', margin: '6px 0', padding: '4px 16px' }}
                    >
                        {loading
                            ? t('dashboard.jobFilter.searching')
                            : t('dashboard.jobFilter.loadMore')
                        }
                    </button>
                )}
            </div>
        </div>
    );
});

AdvancedFilterPanel.displayName = 'AdvancedFilterPanel';

export default AdvancedFilterPanel;
