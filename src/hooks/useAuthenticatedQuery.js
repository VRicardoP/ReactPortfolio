import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../context/AuthContext';

const EMPTY_DEPS = [];

/**
 * Ejecuta una consulta JSON autenticada y descarta cualquier respuesta que
 * haya quedado por detrás de una consulta posterior.
 */
const useAuthenticatedQuery = (
    url,
    { enabled = true, deps = EMPTY_DEPS } = {},
) => {
    const { authenticatedFetch } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);
    const generationRef = useRef(0);
    const previousDepsRef = useRef(deps);
    const depsVersionRef = useRef(0);

    if (
        deps.length !== previousDepsRef.current.length
        || deps.some((value, index) => !Object.is(value, previousDepsRef.current[index]))
    ) {
        previousDepsRef.current = deps;
        depsVersionRef.current += 1;
    }

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            generationRef.current += 1;
        };
    }, []);

    const refetch = useCallback(async (overrideUrl) => {
        const target = overrideUrl ?? url;
        if (!target) return null;

        const generation = (generationRef.current += 1);
        const isCurrent = () => (
            mountedRef.current && generation === generationRef.current
        );

        setLoading(true);
        setError(null);
        try {
            const response = await authenticatedFetch(target);
            const result = await response.json();
            if (!isCurrent()) return null;
            setData(result);
            return result;
        } catch (queryError) {
            if (isCurrent()) setError(queryError);
            return null;
        } finally {
            if (isCurrent()) setLoading(false);
        }
    }, [authenticatedFetch, url]);

    const depsVersion = depsVersionRef.current;
    useEffect(() => {
        if (enabled) void refetch();
    }, [enabled, refetch, depsVersion]);

    return { data, loading, error, refetch };
};

export default useAuthenticatedQuery;
