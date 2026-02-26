import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';
import useJobApplication from '../../hooks/useJobApplication';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';

const PAGE_SIZE = 20;

const JobFilterWindow = memo(({ initialPosition, onSaveSearch }) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [filters, setFilters] = useState({
        country: '',
        city: '',
        salaryMin: '',
        salaryMax: '',
        q: '',
        remoteOnly: false,
    });
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(0);
    const { handleApply, appliedIds } = useJobApplication();

    const handleFilterChange = useCallback((field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    }, []);

    const buildQueryParams = useCallback((offset = 0) => {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.country) params.set('country', filters.country);
        if (filters.city) params.set('city', filters.city);
        if (filters.salaryMin) params.set('salary_min', filters.salaryMin);
        if (filters.salaryMax) params.set('salary_max', filters.salaryMax);
        if (filters.remoteOnly) params.set('remote_only', 'true');
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(offset));
        return params.toString();
    }, [filters]);

    const handleSearch = useCallback(async (newPage = 0) => {
        setLoading(true);
        setSearched(true);
        setPage(newPage);
        try {
            const qs = buildQueryParams(newPage * PAGE_SIZE);
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/jobs/search?${qs}`
            );
            const data = await response.json();
            setResults(data.data || []);
            setTotal(data.metadata?.total || 0);
        } catch {
            setResults([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, buildQueryParams]);

    const handleClear = useCallback(() => {
        setFilters({ country: '', city: '', salaryMin: '', salaryMax: '', q: '', remoteOnly: false });
        setResults([]);
        setTotal(0);
        setSearched(false);
        setPage(0);
    }, []);

    const handleSave = useCallback(() => {
        if (onSaveSearch) {
            onSaveSearch({
                country: filters.country,
                city: filters.city,
                salaryMin: filters.salaryMin,
                salaryMax: filters.salaryMax,
                q: filters.q,
                remoteOnly: filters.remoteOnly,
            });
        }
    }, [onSaveSearch, filters]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const hasFilters = filters.country || filters.city || filters.salaryMin || filters.salaryMax || filters.q || filters.remoteOnly;

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${theme.border}`,
        color: theme.text,
        padding: '6px 10px',
        borderRadius: '3px',
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    };

    const btnStyle = (variant) => ({
        background: variant === 'primary'
            ? `rgba(${theme.primaryRgb}, 0.2)`
            : 'transparent',
        border: `1px solid ${variant === 'primary' ? theme.primary : theme.border}`,
        color: variant === 'primary' ? theme.primary : theme.text,
        padding: '6px 14px',
        borderRadius: '3px',
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });

    const formatSalary = (min, max, currency) => {
        const cur = currency || 'USD';
        if (min && max) return `${cur} ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
        if (min) return `${cur} ${Number(min).toLocaleString()}+`;
        if (max) return `${cur} ≤${Number(max).toLocaleString()}`;
        return '';
    };

    return (
        <FloatingWindow
            id="job-filter-window"
            title={t('dashboard.jobFilter.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 650, height: 550 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '8px' }}>
                {/* Filter form */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px',
                    padding: '8px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.02)',
                }}>
                    <div>
                        <label style={{ fontSize: '10px', color: theme.text, opacity: 0.7, fontFamily: 'Courier New' }}>
                            {t('dashboard.jobFilter.searchLabel')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('dashboard.jobFilter.searchPlaceholder')}
                            value={filters.q}
                            onChange={(e) => handleFilterChange('q', e.target.value)}
                            style={inputStyle}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', color: theme.text, opacity: 0.7, fontFamily: 'Courier New' }}>
                            {t('dashboard.jobFilter.countryLabel')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('dashboard.jobFilter.countryPlaceholder')}
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                            style={inputStyle}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', color: theme.text, opacity: 0.7, fontFamily: 'Courier New' }}>
                            {t('dashboard.jobFilter.cityLabel')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('dashboard.jobFilter.cityPlaceholder')}
                            value={filters.city}
                            onChange={(e) => handleFilterChange('city', e.target.value)}
                            style={inputStyle}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '10px', color: theme.text, opacity: 0.7, fontFamily: 'Courier New' }}>
                                {t('dashboard.jobFilter.salaryMin')}
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                value={filters.salaryMin}
                                onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
                                style={inputStyle}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '10px', color: theme.text, opacity: 0.7, fontFamily: 'Courier New' }}>
                                {t('dashboard.jobFilter.salaryMax')}
                            </label>
                            <input
                                type="number"
                                placeholder="999999"
                                value={filters.salaryMax}
                                onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
                                style={inputStyle}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(0)}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '11px', color: theme.text, fontFamily: 'Courier New', cursor: 'pointer',
                        }}>
                            <input
                                type="checkbox"
                                checked={filters.remoteOnly}
                                onChange={(e) => handleFilterChange('remoteOnly', e.target.checked)}
                            />
                            {t('dashboard.jobFilter.remoteOnly')}
                        </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end', gap: '6px', justifyContent: 'flex-end' }}>
                        <button style={btnStyle('primary')} onClick={() => handleSearch(0)}>
                            {t('dashboard.jobFilter.search')}
                        </button>
                        {hasFilters && (
                            <button style={btnStyle('secondary')} onClick={handleClear}>
                                {t('dashboard.jobFilter.clear')}
                            </button>
                        )}
                        {hasFilters && onSaveSearch && (
                            <button style={btnStyle('secondary')} onClick={handleSave}>
                                {t('dashboard.jobFilter.saveSearch')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Results header */}
                {searched && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontFamily: 'Courier New', fontSize: '11px', color: theme.text, opacity: 0.7,
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
                                    style={{ ...btnStyle('secondary'), padding: '2px 8px', fontSize: '11px' }}
                                >
                                    &lt;
                                </button>
                                <span>{page + 1}/{totalPages}</span>
                                <button
                                    disabled={page >= totalPages - 1}
                                    onClick={() => handleSearch(page + 1)}
                                    style={{ ...btnStyle('secondary'), padding: '2px 8px', fontSize: '11px' }}
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
                        <div style={{
                            padding: '30px 20px', textAlign: 'center',
                            fontFamily: 'Courier New', fontSize: '12px', color: theme.text, opacity: 0.5,
                        }}>
                            {t('dashboard.jobFilter.hint')}
                        </div>
                    )}

                    {searched && !loading && results.length === 0 && (
                        <div style={{
                            padding: '30px 20px', textAlign: 'center',
                            fontFamily: 'Courier New', fontSize: '12px', color: theme.text, opacity: 0.5,
                        }}>
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
