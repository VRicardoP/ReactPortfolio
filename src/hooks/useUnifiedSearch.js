import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
import { JOBS_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';

const DEBOUNCE_MS = 300;

const INITIAL_FILTERS = {
    source: '',
    remote: false,
    country: '',
};

/**
 * Business logic for the unified job search window: debounced query,
 * filter management, paginated results, and search URL construction.
 * Used by UnifiedJobSearchWindow.
 */
const useUnifiedSearch = () => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState(INITIAL_FILTERS);

    const debounceRef = useRef(null);

    /** Build the search URL from current query and filters. */
    const buildSearchUrl = useCallback((searchQuery, currentFilters) => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (currentFilters.source) params.set('source', currentFilters.source);
        if (currentFilters.remote) params.set('remote_only', 'true');
        if (currentFilters.country) params.set('country', currentFilters.country);
        return `${BACKEND_URL}/api/v1/jobs/search?${params.toString()}`;
    }, []);

    /** Perform the search API call. */
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
            showToast(t('dashboard.unified.errorSearch'));
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, buildSearchUrl, t]);

    // Debounce query and filter changes
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            performSearch(query, filters);
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, filters, performSearch]);

    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(results.length / JOBS_PAGE_SIZE));
    const pagedResults = results.slice(page * JOBS_PAGE_SIZE, (page + 1) * JOBS_PAGE_SIZE);

    return {
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
    };
};

export default useUnifiedSearch;
