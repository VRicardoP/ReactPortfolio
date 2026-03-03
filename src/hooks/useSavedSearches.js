import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
import { JOBS_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';

const INITIAL_FORM = {
    name: '',
    q: '',
    country: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
    remoteOnly: false,
};

/**
 * Business logic for saved searches: CRUD operations, running searches,
 * and managing form state. Used by SavedSearchesWindow.
 */
const useSavedSearches = () => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();

    const [searches, setSearches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [expandedId, setExpandedId] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [resultsTotal, setResultsTotal] = useState(0);

    // Fetch saved searches on mount
    const fetchSearches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/`);
            const data = await response.json();
            setSearches(Array.isArray(data) ? data : data.results || data.data || []);
        } catch {
            setSearches([]);
            showToast(t('dashboard.savedSearches.errorLoad'));
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, t]);

    useEffect(() => {
        fetchSearches();
    }, [fetchSearches]);

    const handleFormChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Build an auto-name from filters when no explicit name given
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
            showToast(t('dashboard.savedSearches.errorCreate'));
        }
    }, [authenticatedFetch, formData, fetchSearches, autoName, t]);

    // Run a saved search (toggle expand/collapse)
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
            params.set('limit', String(JOBS_PAGE_SIZE));

            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/jobs/search?${params.toString()}`
            );
            const data = await response.json();
            setSearchResults(data.data || []);
            setResultsTotal(data.metadata?.total || 0);
        } catch {
            showToast(t('dashboard.savedSearches.errorRun'));
            setSearchResults([]);
            setResultsTotal(0);
        } finally {
            setSearchLoading(false);
        }
    }, [authenticatedFetch, expandedId, t]);

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
            showToast(t('dashboard.savedSearches.errorDelete'));
            fetchSearches();
        }
    }, [authenticatedFetch, fetchSearches, t, expandedId]);

    // Whether the form has any filter filled in
    const hasAnyFilter = formData.q || formData.country || formData.city
        || formData.salaryMin || formData.salaryMax || formData.remoteOnly;

    return {
        searches,
        loading,
        showForm,
        setShowForm,
        formData,
        hasAnyFilter,
        handleFormChange,
        autoName,
        handleCreate,
        handleRun,
        handleDelete,
        expandedId,
        setExpandedId,
        searchResults,
        searchLoading,
        resultsTotal,
    };
};

export default useSavedSearches;
