import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useTheme } from '../../context/ThemeContext';
import useJobApplication from '../../hooks/useJobApplication';
import useJobFilter from '../../hooks/useJobFilter';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';
import '../../styles/dashboard-forms.css';

const JobFilterWindow = memo(({ initialPosition, onSaveSearch }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { handleApply, appliedIds } = useJobApplication();

    const {
        filters, results, total, loading, searched, page,
        totalPages, hasFilters,
        handleFilterChange, handleSearch, handleClear, handleSave, formatSalary,
    } = useJobFilter(onSaveSearch);

    return (
        <FloatingWindow
            id="job-filter-window"
            title={t('dashboard.jobFilter.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 650, height: 550 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '8px' }}>
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
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
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
                        <button className="dash-btn dash-btn-primary dash-btn-lg" onClick={() => handleSearch(0)}>
                            {t('dashboard.jobFilter.search')}
                        </button>
                        {hasFilters && (
                            <button className="dash-btn dash-btn-lg" onClick={handleClear}>
                                {t('dashboard.jobFilter.clear')}
                            </button>
                        )}
                        {hasFilters && onSaveSearch && (
                            <button className="dash-btn dash-btn-lg" onClick={handleSave}>
                                {t('dashboard.jobFilter.saveSearch')}
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
                                : `${total} ${t('dashboard.jobFilter.resultsFound')}`
                            }
                        </span>
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <button
                                    disabled={page === 0}
                                    onClick={() => handleSearch(page - 1)}
                                    className="dash-btn"
                                    style={{ padding: '2px 8px' }}
                                >
                                    &lt;
                                </button>
                                <span>{page + 1}/{totalPages}</span>
                                <button
                                    disabled={page >= totalPages - 1}
                                    onClick={() => handleSearch(page + 1)}
                                    className="dash-btn"
                                    style={{ padding: '2px 8px' }}
                                >
                                    &gt;
                                </button>
                            </div>
                        )}
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
                        <div
                            key={`${job.source}-${job.id}`}
                            style={{
                                padding: '8px 10px',
                                border: `1px solid ${theme.borderLight}`,
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.02)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: 'Courier New', fontSize: '13px',
                                        color: theme.textHighlight, fontWeight: 'bold',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {job.title}
                                    </div>
                                    <div style={{ fontFamily: 'Courier New', fontSize: '11px', color: theme.text, marginTop: '2px' }}>
                                        <CompanyResearchName company={job.company}>{job.company}</CompanyResearchName>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                    {job.remote && (
                                        <span className="jobboard-remote-badge">REMOTE</span>
                                    )}
                                    <span
                                        className="jobboard-source-badge"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.08)',
                                            color: theme.primary,
                                            borderColor: `rgba(${theme.primaryRgb}, 0.3)`,
                                        }}
                                    >
                                        {job.source}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {job.location && (
                                    <span style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.7 }}>
                                        {job.location}
                                    </span>
                                )}
                                {(job.salary_min || job.salary_max) && (
                                    <span style={{
                                        fontFamily: 'Courier New', fontSize: '10px',
                                        color: '#4CAF50', fontWeight: 'bold',
                                    }}>
                                        {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                                    </span>
                                )}
                                {job.employment_type && (
                                    <span style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.5 }}>
                                        {job.employment_type}
                                    </span>
                                )}
                            </div>

                            {job.tags && job.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    {job.tags.slice(0, 5).map(tag => (
                                        <span key={tag} className="jobboard-skill-tag">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginTop: '6px',
                            }}>
                                <span style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.5 }}>
                                    {job.date ? new Date(job.date).toLocaleDateString() : ''}
                                    <FreshnessBadge dateStr={job.date} />
                                </span>
                                {job.url && (
                                    <button
                                        onClick={() => handleApply(job)}
                                        className={`jobboard-apply-btn ${appliedIds.has(job.id) ? 'applied' : ''}`}
                                    >
                                        {appliedIds.has(job.id)
                                            ? t('dashboard.jobBoard.applied')
                                            : t('dashboard.jobBoard.apply')
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
});

JobFilterWindow.displayName = 'JobFilterWindow';

export default JobFilterWindow;
