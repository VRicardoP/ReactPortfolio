import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
import { JOBS_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';
import { buildJobSearchParams } from '../utils/jobSearchParams';

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
 * query building, cursor/offset pagination ("load more"), and
 * save-to-saved-searches integration. Used by AdvancedFilterPanel.
 *
 * Pagination contract (single envelope for local AND core routing, see
 * backend/services/catalog): metadata carries `total` (number under the local
 * offset engine, null under the core keyset feed), `has_more` and
 * `next_cursor`. The hook never depends on `total` to paginate: "load more"
 * follows `next_cursor` when present (core) and an accumulated offset when not
 * (local), guided by `has_more`.
 *
 * Identidad de secuencia (P2-1 auditoria G8): la pagina 1 devuelve ademas
 * `metadata.sequence`, un token opaco que el backend acuña por secuencia. El
 * hook lo guarda y lo REENVIA en cada "cargar mas" — sin eso el backend cae a
 * su respaldo por IP, y dos pestañas del mismo host (o la peticion duplicada de
 * React StrictMode en desarrollo) comparten la anotacion de que motor sirvio la
 * pagina 1: la pagina 2 puede llegar del otro corpus, con otras identidades y
 * otro orden. El token existia en el servidor desde G7 y ningun cliente lo
 * reenviaba, asi que el 100 % del trafico real caia en el respaldo.
 *
 * @param {Function} [onSaveSearch] — optional callback to save current filters
 */
const useJobFilter = (onSaveSearch) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();

    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(null); // null = unknown (core keyset feed)
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [sequence, setSequence] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleFilterChange = useCallback((field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    }, []);

    const buildQueryParams = useCallback(({ offset = 0, cursor = null, seq = null } = {}) => {
        return buildJobSearchParams({
            q: filters.q,
            country: filters.country,
            city: filters.city,
            salaryMin: filters.salaryMin,
            salaryMax: filters.salaryMax,
            remoteOnly: filters.remoteOnly,
            limit: JOBS_PAGE_SIZE,
            // The core keyset cursor already encodes the position: never send
            // both cursor and a non-zero offset.
            offset: cursor ? undefined : offset,
            cursor,
            sequence: seq,
        }).toString();
    }, [filters]);

    const fetchPage = useCallback(async ({ offset = 0, cursor = null, seq = null, append = false }) => {
        setLoading(true);
        setSearched(true);
        try {
            const qs = buildQueryParams({ offset, cursor, seq });
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/jobs/search?${qs}`
            );
            const data = await response.json();
            const items = data.data || [];
            const meta = data.metadata || {};
            setResults(prev => (append ? [...prev, ...items] : items));
            setTotal(meta.total ?? null);
            setNextCursor(meta.next_cursor ?? null);
            // Solo la pagina 1 acuña token; en un "cargar mas" no viene y hay
            // que CONSERVAR el que abrio la secuencia.
            if (!append) setSequence(meta.sequence ?? null);
            // `has_more` drives the "load more" button; a full page is the
            // conservative fallback if the envelope ever omits it.
            setHasMore(meta.has_more ?? items.length === JOBS_PAGE_SIZE);
        } catch {
            showToast(t('dashboard.jobFilter.errorSearch'));
            // A failed "load more" keeps the pages already shown.
            if (!append) {
                setResults([]);
                setTotal(null);
            }
            setHasMore(false);
            setNextCursor(null);
            if (!append) setSequence(null);
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, buildQueryParams, t]);

    const handleSearch = useCallback(() => fetchPage({ offset: 0 }), [fetchPage]);

    const handleLoadMore = useCallback(() => {
        if (loading) return Promise.resolve();
        // Cursor when the backend gave one (core keyset); accumulated offset
        // otherwise (local engine). Same code path in both routing modes.
        return fetchPage(
            nextCursor
                ? { cursor: nextCursor, seq: sequence, append: true }
                : { offset: results.length, seq: sequence, append: true }
        );
    }, [fetchPage, nextCursor, sequence, results.length, loading]);

    const handleClear = useCallback(() => {
        setFilters(INITIAL_FILTERS);
        setResults([]);
        setTotal(null);
        setHasMore(false);
        setNextCursor(null);
        setSequence(null);
        setSearched(false);
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
        hasMore,
        nextCursor,
        sequence,
        loading,
        searched,
        hasFilters,
        handleFilterChange,
        buildQueryParams,
        handleSearch,
        handleLoadMore,
        handleClear,
        handleSave,
        formatSalary,
    };
};

export default useJobFilter;
