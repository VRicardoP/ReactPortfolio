import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';

const SOURCE_COLORS = {
    jobicy: '#00e5ff',
    remotive: '#ab47bc',
    arbeitnow: '#ff9800',
    jsearch: '#2196f3',
};

const PAGE_SIZE = 20;

const UnifiedJobSearchWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState({
        source: '',
        remote: false,
        country: '',
    });

    const debounceRef = useRef(null);

    // Build the search URL from current query and filters
    const buildSearchUrl = useCallback((searchQuery, currentFilters) => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (currentFilters.source) params.set('source', currentFilters.source);
        if (currentFilters.remote) params.set('remote_only', 'true');
        if (currentFilters.country) params.set('country', currentFilters.country);
        return `${BACKEND_URL}/api/v1/jobs/search?${params.toString()}`;
    }, []);

    // Perform the debounced search
    const performSearch = useCallback(async (searchQuery, currentFilters) => {
        if (!searchQuery && !currentFilters.source) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const url = buildSearchUrl(searchQuery, currentFilters);
            const response = await authenticatedFetch(url);
            const data = await response.json();
            setResults(Array.isArray(data) ? data : data.results || data.data || []);
            setPage(0);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, buildSearchUrl]);

    // Debounce query changes
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            performSearch(query, filters);
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, filters, performSearch]);

    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const pagedResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const sourceColor = (source) => {
        const key = (source || '').toLowerCase();
        return SOURCE_COLORS[key] || theme.primary;
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

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: theme.text, fontFamily: 'Courier New', fontSize: '12px' }}>
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
                    <div style={{ padding: '10px', color: theme.primary, fontFamily: 'Courier New', fontSize: '12px', textAlign: 'center' }}>
                        {t('dashboard.unified.searching')}
                    </div>
                )}

                {/* Results */}
                <div className="jobboard-list">
                    {!loading && pagedResults.length === 0 && query && (
                        <div style={{ padding: '20px', color: theme.text, fontFamily: 'Courier New', fontSize: '12px', textAlign: 'center' }}>
                            {t('dashboard.unified.noResults')}
                        </div>
                    )}

                    {pagedResults.map((job, idx) => (
                        <div key={job.id || job.job_id || idx} className="jobboard-card">
                            <div className="jobboard-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 className="jobboard-title">{job.title || job.job_title}</h3>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                    {(job.remote || job.job_is_remote || job.is_remote) && (
                                        <span style={{
                                            padding: '2px 6px',
                                            borderRadius: '3px',
                                            fontSize: '10px',
                                            fontFamily: 'Courier New',
                                            background: 'rgba(0,255,0,0.15)',
                                            color: '#00ff00',
                                            border: '1px solid rgba(0,255,0,0.3)',
                                        }}>
                                            REMOTE
                                        </span>
                                    )}
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontFamily: 'Courier New',
                                        fontWeight: 'bold',
                                        background: `${sourceColor(job.source)}22`,
                                        color: sourceColor(job.source),
                                        border: `1px solid ${sourceColor(job.source)}55`,
                                    }}>
                                        {job.source || 'Unknown'}
                                    </span>
                                </div>
                            </div>

                            <div className="jobboard-company">
                                {job.company || job.employer_name || job.company_name}
                            </div>

                            {(job.location || job.job_city || job.city) && (
                                <div style={{ fontSize: '11px', color: theme.text, opacity: 0.7, fontFamily: 'Courier New', marginTop: '2px' }}>
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
                {results.length > PAGE_SIZE && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px',
                        fontFamily: 'Courier New',
                        fontSize: '12px',
                        color: theme.text,
                    }}>
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            style={{
                                background: 'transparent',
                                border: `1px solid ${theme.border}`,
                                color: page === 0 ? 'rgba(255,255,255,0.3)' : theme.primary,
                                padding: '4px 12px',
                                borderRadius: '3px',
                                cursor: page === 0 ? 'default' : 'pointer',
                                fontFamily: 'Courier New',
                                fontSize: '11px',
                            }}
                        >
                            {t('dashboard.unified.prev')}
                        </button>
                        <span>{page + 1} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            style={{
                                background: 'transparent',
                                border: `1px solid ${theme.border}`,
                                color: page >= totalPages - 1 ? 'rgba(255,255,255,0.3)' : theme.primary,
                                padding: '4px 12px',
                                borderRadius: '3px',
                                cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                                fontFamily: 'Courier New',
                                fontSize: '11px',
                            }}
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
