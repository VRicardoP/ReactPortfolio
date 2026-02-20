import { memo, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';

const INITIAL_FORM = {
    name: '',
    technologies: '',
    min_score: 50,
};

const SavedSearchesWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [searches, setSearches] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [loading, setLoading] = useState(false);

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

    // Create a new saved search
    const handleCreate = useCallback(async () => {
        if (!formData.name.trim()) return;

        try {
            const techArray = formData.technologies
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/`, {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.name.trim(),
                    filters: {
                        technologies: techArray,
                        min_score: formData.min_score,
                    },
                }),
            });

            setFormData(INITIAL_FORM);
            setShowForm(false);
            fetchSearches();
        } catch {
            // Silently fail - authenticatedFetch already handles 401
        }
    }, [authenticatedFetch, formData, fetchSearches]);

    // Toggle active/paused
    const handleToggle = useCallback(async (search) => {
        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/${search.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: !search.is_active }),
            });
            // Optimistic update
            setSearches(prev =>
                prev.map(s => s.id === search.id ? { ...s, is_active: !s.is_active } : s)
            );
        } catch {
            fetchSearches();
        }
    }, [authenticatedFetch, fetchSearches]);

    // Delete a saved search
    const handleDelete = useCallback(async (id) => {
        const confirmed = window.confirm(t('dashboard.savedSearches.confirmDelete'));
        if (!confirmed) return;

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/${id}`, {
                method: 'DELETE',
            });
            setSearches(prev => prev.filter(s => s.id !== id));
        } catch {
            fetchSearches();
        }
    }, [authenticatedFetch, fetchSearches, t]);

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

    const badgeStyle = (isActive) => ({
        padding: '2px 8px',
        borderRadius: '3px',
        fontSize: '10px',
        fontFamily: 'Courier New',
        fontWeight: 'bold',
        background: isActive ? 'rgba(0,255,0,0.15)' : 'rgba(255,165,0,0.15)',
        color: isActive ? '#00ff00' : '#ff9800',
        border: `1px solid ${isActive ? 'rgba(0,255,0,0.3)' : 'rgba(255,165,0,0.3)'}`,
    });

    return (
        <FloatingWindow
            id="saved-searches-window"
            title={t('dashboard.savedSearches.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 480, height: 400 }}
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
                        gap: '8px',
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
                        <input
                            type="text"
                            placeholder={t('dashboard.savedSearches.techPlaceholder')}
                            value={formData.technologies}
                            onChange={(e) => handleFormChange('technologies', e.target.value)}
                            style={inputStyle}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontFamily: 'Courier New', fontSize: '11px', color: theme.text, whiteSpace: 'nowrap' }}>
                                {t('dashboard.savedSearches.minScore')}: {formData.min_score}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={formData.min_score}
                                onChange={(e) => handleFormChange('min_score', parseInt(e.target.value, 10))}
                                style={{ flex: 1 }}
                            />
                        </div>
                        <button
                            style={buttonStyle('primary')}
                            onClick={handleCreate}
                            disabled={!formData.name.trim()}
                        >
                            {t('dashboard.savedSearches.save')}
                        </button>
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
                        <div
                            key={search.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 10px',
                                border: `1px solid ${theme.borderLight}`,
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.02)',
                            }}
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
                                {search.filters?.technologies?.length > 0 && (
                                    <div style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.6, marginTop: '2px' }}>
                                        {search.filters.technologies.join(', ')}
                                    </div>
                                )}
                            </div>

                            <span style={badgeStyle(search.is_active)}>
                                {search.is_active
                                    ? t('dashboard.savedSearches.active')
                                    : t('dashboard.savedSearches.paused')
                                }
                            </span>

                            <button
                                style={buttonStyle('secondary')}
                                onClick={() => handleToggle(search)}
                            >
                                {search.is_active
                                    ? t('dashboard.savedSearches.pause')
                                    : t('dashboard.savedSearches.resume')
                                }
                            </button>

                            <button
                                style={{ ...buttonStyle('secondary'), color: theme.error, borderColor: theme.error }}
                                onClick={() => handleDelete(search.id)}
                            >
                                {t('dashboard.savedSearches.delete')}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
});

SavedSearchesWindow.displayName = 'SavedSearchesWindow';

export default SavedSearchesWindow;
