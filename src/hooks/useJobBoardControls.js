import { useMemo, useState, useCallback, useEffect } from 'react';

const PAGE_SIZE = 20;

/**
 * Shared hook for job board sorting, pagination, and cache age.
 * @param {Array} filteredJobs - already-filtered job list
 * @param {object} options - { dateField: string, companyField: string, titleField: string }
 */
const useJobBoardControls = (filteredJobs, options = {}) => {
    const {
        dateField = 'date',
        companyField = 'company',
        titleField = 'title',
    } = options;

    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(0);

    // Reset page when sort changes or list changes
    const handleSortChange = useCallback((value) => {
        setSortBy(value);
        setPage(0);
    }, []);

    // Parse date - handles both ISO strings and unix timestamps in seconds
    const parseDate = useCallback((val) => {
        if (!val) return 0;
        if (typeof val === 'number') {
            // Unix timestamps < 1e12 are in seconds, convert to ms
            return val < 1e12 ? val * 1000 : val;
        }
        return new Date(val).getTime() || 0;
    }, []);

    // Sort
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
    const totalPages = Math.max(1, Math.ceil(sortedJobs.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pagedJobs = sortedJobs.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

    const from = sortedJobs.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
    const to = Math.min((safePage + 1) * PAGE_SIZE, sortedJobs.length);

    // Reset page when filtered list shrinks past current page
    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(sortedJobs.length / PAGE_SIZE) - 1);
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
