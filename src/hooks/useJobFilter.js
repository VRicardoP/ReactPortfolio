import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
import { JOBS_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';

const INITIAL_FILTERS = {
    country: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
    q: '',
    remoteOnly: false,
};

/**
 * Business logic for the job filter window: search state, filter management,
 * query building, pagination, and save-to-saved-searches integration.
 * Used by JobFilterWindow.
 *
 * @param {Function} [onSaveSearch] — optional callback to save current filters
 */
const useJobFilter = (onSaveSearch) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();

    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [page, setPage] = useState(0);

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
        params.set('limit', String(JOBS_PAGE_SIZE));
        params.set('offset', String(offset));
        return params.toString();
    }, [filters]);

    const handleSearch = useCallback(async (newPage = 0) => {
        setLoading(true);
        setSearched(true);
        setPage(newPage);
        try {
            const qs = buildQueryParams(newPage * JOBS_PAGE_SIZE);
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/jobs/search?${qs}`
            );
            const data = await response.json();
            setResults(data.data || []);
            setTotal(data.metadata?.total || 0);
        } catch {
            showToast(t('dashboard.jobFilter.errorSearch'));
            setResults([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, buildQueryParams, t]);

    const handleClear = useCallback(() => {
        setFilters(INITIAL_FILTERS);
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

    const totalPages = Math.ceil(total / JOBS_PAGE_SIZE);

    const hasFilters = filters.country || filters.city
        || filters.salaryMin || filters.salaryMax || filters.q || filters.remoteOnly;

    const formatSalary = useCallback((min, max, currency) => {
        const cur = currency || 'USD';
        if (min && max) return `${cur} ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
        if (min) return `${cur} ${Number(min).toLocaleString()}+`;
        if (max) return `${cur} ≤${Number(max).toLocaleString()}`;
        return '';
    }, []);

    return {
        filters,
        results,
        total,
        loading,
        searched,
        page,
        totalPages,
        hasFilters,
        handleFilterChange,
        buildQueryParams,
        handleSearch,
        handleClear,
        handleSave,
        formatSalary,
    };
};

export default useJobFilter;
