import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';

const INITIAL_FORM = {
    name: '',
    q: '',
    country: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
    remoteOnly: false,
};

const SavedSearchesWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [searches, setSearches] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [resultsTotal, setResultsTotal] = useState(0);
    const [appliedIds, setAppliedIds] = useState(new Set());

    // Fetch saved searches on mount
    const fetchSearches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/`);
            const data = await response.json();
            setSearches(Array.isArray(data) ? data : data.results || data.data || []);
        } catch {
            setSearches([]);
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch]);

    useEffect(() => {
        fetchSearches();
    }, [fetchSearches]);

    const handleFormChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Build an auto-name from filters when no explicit name given
    const hasAnyFilter = formData.q || formData.country || formData.city || formData.salaryMin || formData.salaryMax || formData.remoteOnly;

    const autoName = useCallback(() => {
        const parts = [];
        if (formData.q) parts.push(formData.q);
        if (formData.country) parts.push(formData.country);
        if (formData.city) parts.push(formData.city);
        if (formData.salaryMin || formData.salaryMax) {
            const min = formData.salaryMin || '0';
            const max = formData.salaryMax || '...';
            parts.push(`$${min}-${max}`);
        }
        if (formData.remoteOnly) parts.push('Remote');
        return parts.join(' | ') || 'Search';
    }, [formData]);

    // Create a new saved search
    const handleCreate = useCallback(async () => {
        const name = formData.name.trim() || autoName();
        if (!name) return;

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/`, {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    filters: {
                        q: formData.q || undefined,
                        country: formData.country || undefined,
                        city: formData.city || undefined,
                        salary_min: formData.salaryMin ? Number(formData.salaryMin) : undefined,
                        salary_max: formData.salaryMax ? Number(formData.salaryMax) : undefined,
                        remote_only: formData.remoteOnly || undefined,
                    },
                }),
            });

            setFormData(INITIAL_FORM);
            setShowForm(false);
            fetchSearches();
        } catch {
            // Silently fail
        }
    }, [authenticatedFetch, formData, fetchSearches, autoName]);

    // Run a saved search
    const handleRun = useCallback(async (search) => {
        if (expandedId === search.id) {
            setExpandedId(null);
            setSearchResults([]);
            return;
        }
        setExpandedId(search.id);
        setSearchLoading(true);
        setSearchResults([]);

        try {
            const filters = search.filters || {};
            const params = new URLSearchParams();
            if (filters.q) params.set('q', filters.q);
            if (filters.country) params.set('country', filters.country);
            if (filters.city) params.set('city', filters.city);
            if (filters.salary_min) params.set('salary_min', String(filters.salary_min));
            if (filters.salary_max) params.set('salary_max', String(filters.salary_max));
            if (filters.remote_only) params.set('remote_only', 'true');
            // Also support legacy format
            if (filters.technologies?.length > 0) params.set('q', filters.technologies.join(' '));
            params.set('limit', '20');

            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/jobs/search?${params.toString()}`
            );
            const data = await response.json();
            setSearchResults(data.data || []);
            setResultsTotal(data.metadata?.total || 0);
        } catch {
            setSearchResults([]);
            setResultsTotal(0);
        } finally {
            setSearchLoading(false);
        }
    }, [authenticatedFetch, expandedId]);

    // Delete a saved search
    const handleDelete = useCallback(async (id) => {
        const confirmed = window.confirm(t('dashboard.savedSearches.confirmDelete'));
        if (!confirmed) return;

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/${id}`, {
                method: 'DELETE',
            });
            setSearches(prev => prev.filter(s => s.id !== id));
            if (expandedId === id) {
                setExpandedId(null);
                setSearchResults([]);
            }
        } catch {
            fetchSearches();
        }
    }, [authenticatedFetch, fetchSearches, t, expandedId]);

    const handleApply = useCallback(async (job) => {
        if (job.url) {
            window.open(job.url, '_blank', 'noopener,noreferrer');
        }
        if (appliedIds.has(job.id)) return;
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/applications/`, {
                method: 'POST',
                body: JSON.stringify({
                    title: job.title,
                    company: job.company,
                    url: job.url || null,
                    source: job.source,
                    status: 'applied',
                }),
            });
            setAppliedIds(prev => new Set(prev).add(job.id));
        } catch {
            // URL already opened
        }
    }, [authenticatedFetch, appliedIds]);

    // Format filter summary for display
    const filterSummary = (filters) => {
        if (!filters) return '';
        const parts = [];
        if (filters.q) parts.push(filters.q);
        if (filters.country) parts.push(filters.country);
        if (filters.city) parts.push(filters.city);
        if (filters.salary_min || filters.salary_max) {
            const min = filters.salary_min ? `$${Number(filters.salary_min).toLocaleString()}` : '';
            const max = filters.salary_max ? `$${Number(filters.salary_max).toLocaleString()}` : '';
            parts.push(min && max ? `${min}-${max}` : min || `≤${max}`);
        }
        if (filters.remote_only) parts.push('Remote');
        // Legacy
        if (filters.technologies?.length > 0) parts.push(filters.technologies.join(', '));
        return parts.join(' | ');
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
        width: '100%',
        boxSizing: 'border-box',
    };

    const buttonStyle = (variant) => ({
        background: variant === 'primary' ? `rgba(${theme.primaryRgb}, 0.2)` : 'transparent',
        border: `1px solid ${variant === 'primary' ? theme.primary : theme.border}`,
        color: variant === 'primary' ? theme.primary : theme.text,
        padding: '4px 10px',
        borderRadius: '3px',
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });

    return (
        <FloatingWindow
            id="saved-searches-window"
            title={t('dashboard.savedSearches.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 520, height: 450 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '10px' }}>
                {/* Header with add button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Courier New', fontSize: '12px', color: theme.text, opacity: 0.7 }}>
                        {searches.length} {t('dashboard.savedSearches.count')}
                    </span>
                    <button
                        style={buttonStyle('primary')}
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? t('dashboard.savedSearches.cancel') : t('dashboard.savedSearches.add')}
                    </button>
                </div>

                {/* Create form */}
                {showForm && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '10px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.02)',
                    }}>
                        <input
                            type="text"
                            placeholder={t('dashboard.savedSearches.namePlaceholder')}
                            value={formData.name}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            style={inputStyle}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <input
                                type="text"
                                placeholder={t('dashboard.savedSearches.queryPlaceholder')}
                                value={formData.q}
                                onChange={(e) => handleFormChange('q', e.target.value)}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder={t('dashboard.savedSearches.countryPlaceholder')}
                                value={formData.country}
                                onChange={(e) => handleFormChange('country', e.target.value)}
                                style={inputStyle}
                            />
                            <input
                                type="text"
                                placeholder={t('dashboard.savedSearches.cityPlaceholder')}
                                value={formData.city}
                                onChange={(e) => handleFormChange('city', e.target.value)}
                                style={inputStyle}
                            />
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                    type="number"
                                    placeholder={t('dashboard.savedSearches.salaryMinPH')}
                                    value={formData.salaryMin}
                                    onChange={(e) => handleFormChange('salaryMin', e.target.value)}
                                    style={{ ...inputStyle, width: '50%' }}
                                />
                                <input
                                    type="number"
                                    placeholder={t('dashboard.savedSearches.salaryMaxPH')}
                                    value={formData.salaryMax}
                                    onChange={(e) => handleFormChange('salaryMax', e.target.value)}
                                    style={{ ...inputStyle, width: '50%' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '11px', color: theme.text, fontFamily: 'Courier New', cursor: 'pointer',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={formData.remoteOnly}
                                    onChange={(e) => handleFormChange('remoteOnly', e.target.checked)}
                                />
                                {t('dashboard.savedSearches.remoteOnly')}
                            </label>
                            <button
                                style={buttonStyle('primary')}
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
                        <div style={{ padding: '20px', color: theme.primary, fontFamily: 'Courier New', fontSize: '12px', textAlign: 'center' }}>
                            {t('dashboard.savedSearches.loading')}
                        </div>
                    )}

                    {!loading && searches.length === 0 && (
                        <div style={{ padding: '20px', color: theme.text, fontFamily: 'Courier New', fontSize: '12px', textAlign: 'center', opacity: 0.6 }}>
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
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onClick={() => handleRun(search)}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
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
                                        {filterSummary(search.filters)}
                                    </div>
                                </div>

                                <button
                                    style={{ ...buttonStyle('secondary'), color: theme.error, borderColor: theme.error }}
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
                                        <div style={{ padding: '10px', color: theme.primary, fontFamily: 'Courier New', fontSize: '11px', textAlign: 'center' }}>
                                            {t('dashboard.savedSearches.searching')}
                                        </div>
                                    )}
                                    {!searchLoading && searchResults.length === 0 && (
                                        <div style={{ padding: '10px', color: theme.text, fontFamily: 'Courier New', fontSize: '11px', textAlign: 'center', opacity: 0.5 }}>
                                            {t('dashboard.savedSearches.noResults')}
                                        </div>
                                    )}
                                    {!searchLoading && searchResults.length > 0 && (
                                        <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.6, marginBottom: '6px' }}>
                                            {resultsTotal} {t('dashboard.savedSearches.resultsFound')}
                                        </div>
                                    )}
                                    {searchResults.map(job => (
                                        <div
                                            key={`${job.source}-${job.id}`}
                                            style={{
                                                padding: '6px 8px',
                                                borderBottom: `1px solid ${theme.borderLight}`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '12px', color: theme.textHighlight,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {job.title}
                                                </div>
                                                <div style={{ fontSize: '10px', color: theme.text, opacity: 0.7 }}>
                                                    <CompanyResearchName company={job.company}>{job.company}</CompanyResearchName>
                                                    {job.location ? ` — ${job.location}` : ''}
                                                    {(job.salary_min || job.salary_max) && (
                                                        <span style={{ color: '#4CAF50', marginLeft: '6px' }}>
                                                            {job.salary_currency || 'USD'} {job.salary_min ? Number(job.salary_min).toLocaleString() : '?'}
                                                            -{job.salary_max ? Number(job.salary_max).toLocaleString() : '?'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                                <span style={{
                                                    fontSize: '9px', padding: '1px 5px',
                                                    borderRadius: '3px', fontFamily: 'Courier New',
                                                    background: `rgba(${theme.primaryRgb}, 0.1)`,
                                                    color: theme.primary,
                                                    border: `1px solid rgba(${theme.primaryRgb}, 0.2)`,
                                                }}>
                                                    {job.source}
                                                </span>
                                                {job.url && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleApply(job); }}
                                                        className={`jobboard-apply-btn ${appliedIds.has(job.id) ? 'applied' : ''}`}
                                                        style={{ padding: '2px 8px', fontSize: '10px' }}
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
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
});

SavedSearchesWindow.displayName = 'SavedSearchesWindow';

export default SavedSearchesWindow;
