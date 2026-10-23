import { useCallback, useEffect, useMemo, useState } from 'react';

import { AI_MATCH_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';

export const ALL_MATCH_SOURCES = 'all';

// Mantiene filtros, paginación y expansión de las tarjetas de resultados.
const useMatchResultsView = (results) => {
    const [page, setPage] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [sourceFilter, setSourceFilter] = useState(ALL_MATCH_SOURCES);
    const [remoteOnly, setRemoteOnly] = useState(false);

    // Un resultado nuevo siempre empieza en la primera página, igual que en el
    // contrato anterior del hook compuesto.
    useEffect(() => setPage(0), [results]);

    const availableSources = useMemo(() => (
        [...new Set(results.map(job => job.source).filter(Boolean))].sort()
    ), [results]);

    const remoteResults = useMemo(() => (
        remoteOnly ? results.filter(job => job.remote === true) : results
    ), [results, remoteOnly]);

    const sourceCounts = useMemo(() => {
        const counts = { [ALL_MATCH_SOURCES]: remoteResults.length };
        for (const source of availableSources) counts[source] = 0;
        for (const job of remoteResults) {
            if (job.source) counts[job.source] = (counts[job.source] || 0) + 1;
        }
        return counts;
    }, [availableSources, remoteResults]);

    const filteredResults = useMemo(() => (
        sourceFilter === ALL_MATCH_SOURCES
            ? remoteResults
            : remoteResults.filter(job => job.source === sourceFilter)
    ), [remoteResults, sourceFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredResults.length / AI_MATCH_PAGE_SIZE));
    const pagedResults = filteredResults.slice(
        page * AI_MATCH_PAGE_SIZE,
        (page + 1) * AI_MATCH_PAGE_SIZE
    );

    const selectSource = useCallback((source) => {
        setSourceFilter(source);
        setPage(0);
        setExpandedId(null);
    }, []);

    const toggleRemoteOnly = useCallback(() => {
        setRemoteOnly(value => !value);
        setPage(0);
        setExpandedId(null);
    }, []);

    const prevPage = useCallback(() => setPage(value => value - 1), []);
    const nextPage = useCallback(() => setPage(value => value + 1), []);
    const toggleExpanded = useCallback((globalIdx) => {
        setExpandedId(value => (value === globalIdx ? null : globalIdx));
    }, []);

    return {
        page,
        totalPages,
        pagedResults,
        filteredResults,
        availableSources,
        sourceCounts,
        sourceFilter,
        selectSource,
        remoteOnly,
        toggleRemoteOnly,
        prevPage,
        nextPage,
        expandedId,
        toggleExpanded,
    };
};

export default useMatchResultsView;
