import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import useJSearchLive from '../../hooks/useJSearchLive';
import '../../styles/dashboard-forms.css';

const JSearchLiveWindow = memo(({ initialPosition }) => {
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
    } = useJSearchLive();

    return (
        <FloatingWindow
            id="jsearch-live-window"
            title={t('dashboard.jsearchLive.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 600, height: 500 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '10px' }}>
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
                        const jobTitle = job.job_title || job.title;
                        const employerName = job.employer_name || job.employer;
                        const employerLogo = job.employer_logo;
                        const isRemote = job.job_is_remote ?? job.is_remote;
                        const city = job.job_city || job.city;
                        const country = job.job_country || job.country;
                        const empType = job.job_employment_type || job.employment_type;
                        const publisher = job.job_publisher || job.publisher;
                        const applyLink = job.job_apply_link || job.apply_link;
                        const salary = formatSalary(job);

                        return (
                            <div key={job.job_id || idx} className="jobboard-card jsearch-card">
                                <div className="jobboard-card-header">
                                    <div className="jsearch-title-row">
                                        {employerLogo && (
                                            <img
                                                src={employerLogo}
                                                alt={employerName}
                                                className="jsearch-logo"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        )}
                                        <h3 className="jobboard-title">{jobTitle}</h3>
                                    </div>
                                    <span className={`jobboard-type ${isRemote ? 'jsearch-remote' : 'jsearch-onsite'}`}>
                                        {isRemote ? t('dashboard.jobBoard.remote') : t('dashboard.jobBoard.onsite')}
                                    </span>
                                </div>

                                <div className="jobboard-company">{employerName}</div>

                                <div className="jobboard-meta">
                                    <span className="jobboard-country">
                                        {city}{country ? ` (${country})` : ''}
                                    </span>
                                    {empType && <span className="jobboard-industry">{empType}</span>}
                                </div>

                                {salary && (
                                    <div className="jsearch-salary">{salary}</div>
                                )}

                                {publisher && (
                                    <div className="jsearch-source">
                                        <span className="jsearch-source-tag">{publisher}</span>
                                    </div>
                                )}

                                <div className="jobboard-card-footer">
                                    <span className="jobboard-date">
                                        {job.job_posted_at || job.posted_at || t('dashboard.jobBoard.recently')}
                                    </span>
                                    {applyLink && (
                                        <a
                                            href={applyLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="jobboard-apply-btn jsearch-apply"
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
        </FloatingWindow>
    );
});

JSearchLiveWindow.displayName = 'JSearchLiveWindow';

export default JSearchLiveWindow;
