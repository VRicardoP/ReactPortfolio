import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useTheme } from '../../context/ThemeContext';
import { SOURCE_COLOR_MAP } from '../../config/jobSources';
import { JOBS_PAGE_SIZE } from './dashboardConstants';
import useUnifiedSearch from '../../hooks/useUnifiedSearch';
import '../../styles/dashboard-forms.css';

const UnifiedJobSearchWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();

    const {
        query,
        setQuery,
        results,
        loading,
        page,
        setPage,
        filters,
        handleFilterChange,
        totalPages,
        pagedResults,
    } = useUnifiedSearch();

    const sourceColor = (source) => {
        const key = (source || '').toLowerCase();
        return SOURCE_COLOR_MAP[key] || theme.primary;
    };

    return (
        <FloatingWindow
            id="unified-search-window"
            title={t('dashboard.unified.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 650, height: 550 }}
        >
            <div className="jobboard-container">
                {/* Filter bar */}
                <div className="jobboard-filters">
                    <input
                        type="text"
                        placeholder={t('dashboard.unified.searchPlaceholder')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="jobboard-search"
                    />

                    <select
                        value={filters.source}
                        onChange={(e) => handleFilterChange('source', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">{t('dashboard.unified.allSources')}</option>
                        <option value="jobicy">Jobicy</option>
                        <option value="remotive">Remotive</option>
                        <option value="arbeitnow">Arbeitnow</option>
                        <option value="jsearch">JSearch</option>
                    </select>

                    <label className="dash-checkbox-row">
                        <input
                            type="checkbox"
                            checked={filters.remote}
                            onChange={(e) => handleFilterChange('remote', e.target.checked)}
                        />
                        {t('dashboard.unified.remoteOnly')}
                    </label>
                </div>

                {/* Status */}
                {loading && (
                    <div className="dash-status-text dash-status-text--accent" style={{ padding: '10px' }}>
                        {t('dashboard.unified.searching')}
                    </div>
                )}

                {/* Results */}
                <div className="jobboard-list">
                    {!loading && pagedResults.length === 0 && query && (
                        <div className="dash-status-text dash-status-text--muted">
                            {t('dashboard.unified.noResults')}
                        </div>
                    )}

                    {pagedResults.map((job, idx) => (
                        <div key={job.id || job.job_id || idx} className="jobboard-card">
                            <div className="jobboard-card-header">
                                <h3 className="jobboard-title">{job.title || job.job_title}</h3>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                    {(job.remote || job.job_is_remote || job.is_remote) && (
                                        <span className="jobboard-remote-badge">
                                            REMOTE
                                        </span>
                                    )}
                                    <span
                                        className="jobboard-source-badge"
                                        style={{
                                            background: `${sourceColor(job.source)}22`,
                                            color: sourceColor(job.source),
                                            borderColor: `${sourceColor(job.source)}55`,
                                        }}
                                    >
                                        {job.source || 'Unknown'}
                                    </span>
                                </div>
                            </div>

                            <div className="jobboard-company">
                                {job.company || job.employer_name || job.company_name}
                            </div>

                            {(job.location || job.job_city || job.city) && (
                                <div className="jobboard-location">
                                    {job.location || job.job_city || job.city}
                                </div>
                            )}

                            <div className="jobboard-card-footer">
                                <span className="jobboard-date">
                                    {job.date || job.posted_at || job.job_posted_at || ''}
                                </span>
                                {(job.url || job.apply_link || job.job_apply_link) && (
                                    <a
                                        href={job.url || job.apply_link || job.job_apply_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="jobboard-apply-btn"
                                    >
                                        {t('dashboard.jobBoard.apply')}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {results.length > JOBS_PAGE_SIZE && (
                    <div className="dash-pagination">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="dash-page-btn"
                        >
                            {t('dashboard.unified.prev')}
                        </button>
                        <span>{page + 1} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="dash-page-btn"
                        >
                            {t('dashboard.unified.next')}
                        </button>
                    </div>
                )}
            </div>
        </FloatingWindow>
    );
});

UnifiedJobSearchWindow.displayName = 'UnifiedJobSearchWindow';

export default UnifiedJobSearchWindow;
