import { useCallback, useEffect, useRef, useState } from 'react';

import { ADMIN_BACKEND_URL } from '../config/api';

const POLL_INTERVAL_MS = 2500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Gestiona exclusivamente el ciclo de vida del análisis remoto y su progreso.
const useAnalysisRun = (authenticatedFetch, refetchResult) => {
    const [results, setResults] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [dataSource, setDataSource] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const sourceRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const installResult = useCallback((data, source = null) => {
        if (!mountedRef.current) return;
        setResults(data.results || []);
        setMetadata(data.metadata || null);
        setDataSource(source);
        sourceRef.current = source;
    }, []);

    const fetchResult = useCallback(async () => {
        const payload = await refetchResult();
        if (!payload?.available || !payload.data || !mountedRef.current) return false;
        installResult(payload.data, payload.source);
        return true;
    }, [installResult, refetchResult]);

    const followRunningAnalysis = useCallback(async (isCancelled = () => false) => {
        for (;;) {
            const response = await authenticatedFetch(
                `${ADMIN_BACKEND_URL}/api/v1/ai-match/analyze/progress`
            );
            const state = await response.json();
            if (isCancelled() || !mountedRef.current) return;
            setProgress(state);
            if (state.state === 'done') {
                await fetchResult();
                return;
            }
            if (state.state === 'error') throw new Error(state.error || 'Analysis failed');
            await sleep(POLL_INTERVAL_MS);
            if (isCancelled() || !mountedRef.current) return;
        }
    }, [authenticatedFetch, fetchResult]);

    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        setProgress(null);
        try {
            const response = await authenticatedFetch(
                `${ADMIN_BACKEND_URL}/api/v1/ai-match/analyze/start`,
                { method: 'POST' }
            );
            const payload = await response.json();
            if (payload.source === 'core' && payload.data) {
                installResult(payload.data, 'core');
            } else {
                await followRunningAnalysis();
            }
        } catch (err) {
            if (mountedRef.current) setError(err.message || 'Analysis failed');
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setProgress(null);
            }
        }
    }, [authenticatedFetch, followRunningAnalysis, installResult]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await fetchResult();
                if (sourceRef.current === 'core') return;
                const response = await authenticatedFetch(
                    `${ADMIN_BACKEND_URL}/api/v1/ai-match/analyze/progress`
                );
                if (cancelled) return;
                const state = await response.json();
                if (state.state === 'running' && !cancelled) {
                    setLoading(true);
                    setProgress(state);
                    try {
                        await followRunningAnalysis(() => cancelled);
                    } finally {
                        if (!cancelled && mountedRef.current) {
                            setLoading(false);
                            setProgress(null);
                        }
                    }
                }
            } catch (err) {
                if (!cancelled && mountedRef.current) {
                    setError(err.message || 'Analysis unavailable');
                }
            }
        })();
        return () => { cancelled = true; };
        // La carga inicial debe ejecutarse una sola vez por montaje.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { results, metadata, dataSource, loading, progress, error, runAnalysis };
};

export default useAnalysisRun;
