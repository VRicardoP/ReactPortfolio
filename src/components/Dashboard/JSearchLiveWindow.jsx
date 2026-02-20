import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';

const COOLDOWN_SECONDS = 12;

const JSearchLiveWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [formFields, setFormFields] = useState({
        query: '',
        country: 'us',
        date_posted: 'all',
        employment_type: 'all',
        remote_only: false,
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(false);
    const [cooldownTimer, setCooldownTimer] = useState(0);
    const timerRef = useRef(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startCooldown = useCallback(() => {
        setCooldown(true);
        setCooldownTimer(COOLDOWN_SECONDS);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setCooldownTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    setCooldown(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleFieldChange = useCallback((field, value) => {
        setFormFields(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSearch = useCallback(async () => {
        if (cooldown || !formFields.query.trim()) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('q', formFields.query.trim());
            if (formFields.country) params.set('country', formFields.country);
            if (formFields.date_posted !== 'all') params.set('date_posted', formFields.date_posted);
            if (formFields.employment_type !== 'all') params.set('employment_type', formFields.employment_type);
            if (formFields.remote_only) params.set('remote_only', 'true');

            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/jsearch-jobs/search?${params.toString()}`);
            const data = await response.json();
            setResults(Array.isArray(data) ? data : data.data || data.results || data.jobs || []);
            startCooldown();
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, formFields, cooldown, startCooldown]);

    // Format salary display
    const formatSalary = (job) => {
        const minSalary = job.job_min_salary || job.min_salary;
        const maxSalary = job.job_max_salary || job.max_salary;
        if (!minSalary && !maxSalary) return null;

        const currency = job.job_salary_currency || job.salary_currency || 'USD';
        const period = job.job_salary_period || 'year';

        if (minSalary && maxSalary) {
            return `${currency} ${minSalary.toLocaleString()}-${maxSalary.toLocaleString()}/${period}`;
        }
        if (minSalary) return `${currency} ${minSalary.toLocaleString()}+/${period}`;
        return `${currency} ${maxSalary.toLocaleString()}/${period}`;
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${theme.border}`,
        color: theme.text,
        padding: '6px 10px',
        borderRadius: '3px',
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        outline: 'none',
    };

    const selectStyle = {
        ...inputStyle,
        cursor: 'pointer',
    };

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
                        style={{ ...inputStyle, flex: '1 1 200px' }}
                    />

                    <select
                        value={formFields.country}
                        onChange={(e) => handleFieldChange('country', e.target.value)}
                        style={selectStyle}
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
                        style={selectStyle}
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
                        style={selectStyle}
                    >
                        <option value="all">{t('dashboard.jsearchLive.allTypes')}</option>
                        <option value="FULLTIME">{t('dashboard.jsearchLive.fulltime')}</option>
                        <option value="PARTTIME">{t('dashboard.jsearchLive.parttime')}</option>
                        <option value="CONTRACTOR">{t('dashboard.jsearchLive.contractor')}</option>
                        <option value="INTERN">{t('dashboard.jsearchLive.intern')}</option>
                    </select>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: theme.text, fontFamily: 'Courier New', fontSize: '11px' }}>
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
                    style={{
                        background: cooldown ? 'rgba(255,255,255,0.05)' : `rgba(${theme.primaryRgb}, 0.2)`,
                        border: `1px solid ${cooldown ? 'rgba(255,255,255,0.15)' : theme.primary}`,
                        color: cooldown ? 'rgba(255,255,255,0.4)' : theme.primary,
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontFamily: 'Courier New, monospace',
                        fontSize: '12px',
                        cursor: cooldown || loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        alignSelf: 'flex-start',
                    }}
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
                        <div style={{ padding: '20px', color: theme.text, fontFamily: 'Courier New', fontSize: '12px', textAlign: 'center', opacity: 0.6 }}>
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
