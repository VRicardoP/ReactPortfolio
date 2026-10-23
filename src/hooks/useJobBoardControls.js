import { useMemo, useState, useCallback, useEffect } from 'react';
import { JOBS_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';

/**
 * Shared hook for job board sorting, pagination, and cache age.
 * @param {Array} filteredJobs - already-filtered job list
 * @param {object} options - { dateField: string, companyField: string, titleField: string }
 */
// Hook compartido por todos los tableros de ofertas: ordena la lista (por
// fecha, empresa o título) y la reparte en páginas de 20 en 20.
const useJobBoardControls = (filteredJobs, options = {}) => {
    const {
        dateField = 'date',
        companyField = 'company',
        titleField = 'title',
    } = options;

    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(0);

    // Reset page when sort changes or list changes
    // Cambia el criterio de orden y vuelve a la primera página.
    const handleSortChange = useCallback((value) => {
        setSortBy(value);
        setPage(0);
    }, []);

    // Parse date - handles both ISO strings and unix timestamps in seconds
    // Convierte una fecha (venga como texto o como número) a milisegundos,
    // para poder comparar fechas de distintas fuentes entre sí.
    const parseDate = useCallback((val) => {
        if (!val) return 0;
        if (typeof val === 'number') {
            // Unix timestamps < 1e12 are in seconds, convert to ms
            return val < 1e12 ? val * 1000 : val;
        }
        return new Date(val).getTime() || 0;
    }, []);

    // Sort
    // Ordena las ofertas según el criterio elegido (más recientes, más
    // antiguas, por empresa, o por título).
    const sortedJobs = useMemo(() => {
        const jobs = [...filteredJobs];
        switch (sortBy) {
            case 'oldest':
                return jobs.sort((a, b) => parseDate(a[dateField]) - parseDate(b[dateField]));
            case 'company':
                return jobs.sort((a, b) =>
                    (a[companyField] || '').localeCompare(b[companyField] || '')
                );
            case 'title':
                return jobs.sort((a, b) =>
                    (a[titleField] || '').localeCompare(b[titleField] || '')
                );
            case 'newest':
            default:
                return jobs.sort((a, b) => parseDate(b[dateField]) - parseDate(a[dateField]));
        }
    }, [filteredJobs, sortBy, dateField, companyField, titleField, parseDate]);

    // Paginate
    // Calcula qué trozo de la lista ordenada corresponde a la página actual.
    const totalPages = Math.max(1, Math.ceil(sortedJobs.length / JOBS_PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pagedJobs = sortedJobs.slice(safePage * JOBS_PAGE_SIZE, (safePage + 1) * JOBS_PAGE_SIZE);

    const from = sortedJobs.length === 0 ? 0 : safePage * JOBS_PAGE_SIZE + 1;
    const to = Math.min((safePage + 1) * JOBS_PAGE_SIZE, sortedJobs.length);

    // Reset page when filtered list shrinks past current page
    // Si al filtrar la lista se queda más corta que la página en la que
    // estábamos, retrocede a la última página que sí existe.
    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(sortedJobs.length / JOBS_PAGE_SIZE) - 1);
        if (page > maxPage) {
            setPage(maxPage);
        }
    }, [sortedJobs.length, page]);

    return {
        sortBy,
        handleSortChange,
        pagedJobs,
        page: safePage,
        totalPages,
        from,
        to,
        setPage,
    };
};

export default useJobBoardControls;
