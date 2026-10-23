// Pestaña de "búsqueda en vivo": el formulario de filtros y la lista de
// resultados que llegan directamente de JSearch. Solo dibuja la pantalla;
// toda la lógica vive en el hook useJSearchLive (recibido como `live`).

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import JobCard from '../JobCard';

// Live JSearch tab — real-time job search with cooldown (formerly JSearchLiveWindow).
// Purely presentational: all state/logic lives in the useJSearchLive hook, passed in as `live`.
const LiveSearchPanel = memo(({ live }) => {
    const { t } = useTranslation();

    const {
        formFields,
        results,
        loading,
        cooldown,
        cooldownTimer,
        handleFieldChange,
        handleSearch,
        formatSalary,
    } = live;

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Search form */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder={t('dashboard.jsearchLive.queryPlaceholder')}
                    value={formFields.query}
                    onChange={(e) => handleFieldChange('query', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="dash-input"
                    style={{ flex: '1 1 200px' }}
                />

                <select
                    value={formFields.country}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    className="dash-select"
                >
                    <option value="us">US</option>
                    <option value="gb">UK</option>
                    <option value="ca">Canada</option>
                    <option value="de">Germany</option>
                    <option value="fr">France</option>
                    <option value="es">Spain</option>
                    <option value="au">Australia</option>
                </select>

                <select
                    value={formFields.date_posted}
                    onChange={(e) => handleFieldChange('date_posted', e.target.value)}
                    className="dash-select"
                >
                    <option value="all">{t('dashboard.jsearchLive.anyDate')}</option>
                    <option value="today">{t('dashboard.jsearchLive.today')}</option>
                    <option value="3days">{t('dashboard.jsearchLive.threeDays')}</option>
                    <option value="week">{t('dashboard.jsearchLive.week')}</option>
                    <option value="month">{t('dashboard.jsearchLive.month')}</option>
                </select>

                <select
                    value={formFields.employment_type}
                    onChange={(e) => handleFieldChange('employment_type', e.target.value)}
                    className="dash-select"
                >
                    <option value="all">{t('dashboard.jsearchLive.allTypes')}</option>
                    <option value="FULLTIME">{t('dashboard.jsearchLive.fulltime')}</option>
                    <option value="PARTTIME">{t('dashboard.jsearchLive.parttime')}</option>
                    <option value="CONTRACTOR">{t('dashboard.jsearchLive.contractor')}</option>
                    <option value="INTERN">{t('dashboard.jsearchLive.intern')}</option>
                </select>

                <label className="dash-checkbox-row">
                    <input
                        type="checkbox"
                        checked={formFields.remote_only}
                        onChange={(e) => handleFieldChange('remote_only', e.target.checked)}
                    />
                    {t('dashboard.jsearchLive.remoteOnly')}
                </label>
            </div>

            {/* Search button with cooldown */}
            <button
                onClick={handleSearch}
                disabled={cooldown || loading || !formFields.query.trim()}
                className={`dash-btn-search${cooldown ? ' dash-btn-cooldown' : ''}`}
            >
                {loading
                    ? t('dashboard.jsearchLive.searching')
                    : cooldown
                        ? `${t('dashboard.jsearchLive.cooldown')} (${cooldownTimer}s)`
                        : t('dashboard.jsearchLive.search')
                }
            </button>

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.length === 0 && !loading && (
                    <div className="dash-status-text dash-status-text--muted">
                        {t('dashboard.jsearchLive.noResults')}
                    </div>
                )}
                {results.map((job, idx) => {
                    const applyLink = job.job_apply_link || job.apply_link;
                    return (
                        <JobCard
                            key={job.job_id || idx}
                            job={job}
                            variant="live"
                            formatSalary={formatSalary}
                            actions={applyLink && (
                                <a href={applyLink} target="_blank" rel="noopener noreferrer"
                                    className="jobboard-apply-btn jsearch-apply">
                                    {t('dashboard.jobBoard.apply')}
                                </a>
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
});

LiveSearchPanel.displayName = 'LiveSearchPanel';

export default LiveSearchPanel;
