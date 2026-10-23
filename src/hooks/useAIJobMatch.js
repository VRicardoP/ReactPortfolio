import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { AI_MATCH_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';
import useAuthenticatedQuery from './useAuthenticatedQuery';

export const TAB_RESULTS = 'results';
export const TAB_SKILLS_GAP = 'skills-gap';
export const ALL_MATCH_SOURCES = 'all';

// The analysis runs server-side in background: polling this often is cheap
// (a tiny JSON) and keeps the progress bar responsive.
const POLL_INTERVAL_MS = 2500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Maneja la ventana que compara las ofertas de empleo con el perfil usando
 * IA: lanza el análisis en el servidor, sigue su progreso con una barra
 * real, pagina y filtra los resultados, y traduce los títulos que no
 * están en inglés o español.
 *
 * State + logic for the AI job match window.
 *
 * Analysis lifecycle (async, server-side):
 * - On mount, the latest persisted result is fetched and shown instantly —
 *   the analysis is deterministic per job-cache refresh, so it is computed
 *   once server-side and reused all day.
 * - `runAnalysis` POSTs /analyze/start and polls /analyze/progress until the
 *   background task finishes, exposing `progress` for a real progress bar.
 * - If an analysis is already running when the window opens (e.g. the
 *   post-deploy startup run), the hook attaches to it and shows its progress.
 *
 * Behavior notes preserved from the original inline logic:
 * - `page` resets to 0 only on a SUCCESSFUL result load (errors keep the page).
 * - `translatedTitles` merges additively and is never cleared.
 * - `expandedId` is a global slot index (page * pageSize + idx), not a job id.
 */
const useAIJobMatch = () => {
    const { authenticatedFetch } = useAuth();
    const { refetch: refetchResult } = useAuthenticatedQuery(
        `${BACKEND_URL}/api/v1/ai-match/analyze/result`,
        { enabled: false, throwOnError: true },
    );

    const [results, setResults] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [dataSource, setDataSource] = useState(null);
    const sourceRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [translatedTitles, setTranslatedTitles] = useState({});
    const [translating, setTranslating] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_RESULTS);
    const [sourceFilter, setSourceFilter] = useState(ALL_MATCH_SOURCES);
    const [remoteOnly, setRemoteOnly] = useState(false);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const llmUnavailable = results.length > 0 && results.some(j => j.llm_unavailable);

    // If the LLM re-ranking becomes unavailable while Skills Gap is open,
    // force the user back to the Results tab
    // Si la IA deja de estar disponible mientras se mira la pestaña de
    // "habilidades que faltan", vuelve automáticamente a la de resultados.
    useEffect(() => {
        if (llmUnavailable && activeTab === TAB_SKILLS_GAP) {
            setActiveTab(TAB_RESULTS);
        }
    }, [llmUnavailable, activeTab]);

    // Guarda un resultado de análisis ya terminado y vuelve a la primera página.
    const installResult = useCallback((data, source = null) => {
        if (!mountedRef.current) return;
        setResults(data.results || []);
        setMetadata(data.metadata || null);
        setDataSource(source);
        sourceRef.current = source;
        setPage(0);
    }, []);

    // Carga el último resultado ya calculado y guardado.
    /** Load the latest persisted result. Returns true when one was available. */
    const fetchResult = useCallback(async () => {
        const payload = await refetchResult();
        if (!payload?.available || !payload.data || !mountedRef.current) return false;
        installResult(payload.data, payload.source);
        return true;
    }, [installResult, refetchResult]);

    // Consulta el progreso una y otra vez hasta que el análisis termine, y
    // entonces carga el resultado.
    /** Poll /analyze/progress until the background run ends, then load the result. */
    const followRunningAnalysis = useCallback(async (isCancelled = () => false) => {
        for (;;) {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/analyze/progress`
            );
            const state = await response.json();
            if (isCancelled() || !mountedRef.current) return;
            setProgress(state);
            if (state.state === 'done') {
                await fetchResult();
                return;
            }
            if (state.state === 'error') {
                throw new Error(state.error || 'Analysis failed');
            }
            await sleep(POLL_INTERVAL_MS);
            if (isCancelled() || !mountedRef.current) return;
        }
    }, [authenticatedFetch, fetchResult]);

    // Vuelve a pedir al núcleo central la lista de ofertas puntuadas, por si
    // ha aparecido algo nuevo desde la última vez.
    //
    // DT-161: esta llamada enviaba `force=true` ("recalcula aunque haya
    // resultado guardado") y el backend lo IGNORABA, porque el nucleo central
    // mantiene el feed al dia por su cuenta: una tarea de recuperacion
    // periodica mas una materializacion diaria. El parametro se ha retirado de
    // los dos lados, y el boton ya no dice "Analizar" sino "Actualizar", que es
    // lo que de verdad hace.
    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        setProgress(null);
        try {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/analyze/start`,
                { method: 'POST' }
            );
            const payload = await response.json();
            if (payload.source === 'core' && payload.data) {
                installResult(payload.data, 'core');
            } else {
                // Local/canary fallback still uses its asynchronous runner.
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

    // On mount: show the stored result instantly; if a background analysis is
    // already running (post-deploy warm-up, another session), attach to it.
    // Al abrir la ventana, muestra de inmediato el último resultado guardado;
    // si ya había un análisis en marcha, se engancha a su progreso.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await fetchResult();
                if (sourceRef.current === 'core') return; // no local progress for a persistent feed
                const response = await authenticatedFetch(
                    `${BACKEND_URL}/api/v1/ai-match/analyze/progress`
                );
                // DT-187: antes `if (!response.ok || cancelled)`. La mitad de
                // `response.ok` era inalcanzable (`authenticatedFetch` lanza);
                // la de `cancelled` es la que de verdad protege, porque el
                // efecto puede haberse desmontado mientras volvía la respuesta.
                if (cancelled) return;
                const state = await response.json();
                if (state.state === 'running' && !cancelled) {
                    setLoading(true);
                    setProgress(state);
                    try {
                        await followRunningAnalysis(() => cancelled);
                    } finally {
                        if (mountedRef.current) {
                            setLoading(false);
                            setProgress(null);
                        }
                    }
                }
            } catch (err) {
                // "available:false" is normal; an HTTP failure is not an empty feed.
                if (!cancelled && mountedRef.current) setError(err.message || 'Analysis unavailable');
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // DT-139: el feed del Core llega completo. Se filtra antes de paginar para
    // mantener solo diez tarjetas montadas aunque existan miles de evaluaciones.
    // Lista de fuentes distintas presentes en los resultados, para el filtro.
    const availableSources = useMemo(() => (
        [...new Set(results.map(job => job.source).filter(Boolean))].sort()
    ), [results]);

    // Si está activo el filtro "solo remoto", se queda solo con esas ofertas.
    const remoteResults = useMemo(() => (
        remoteOnly ? results.filter(job => job.remote === true) : results
    ), [results, remoteOnly]);

    // Cuenta cuántas ofertas hay por cada fuente, para mostrarlo en el filtro.
    const sourceCounts = useMemo(() => {
        const counts = { [ALL_MATCH_SOURCES]: remoteResults.length };
        for (const source of availableSources) counts[source] = 0;
        for (const job of remoteResults) {
            if (job.source) counts[job.source] = (counts[job.source] || 0) + 1;
        }
        return counts;
    }, [availableSources, remoteResults]);

    // Aplica el filtro de fuente elegido a los resultados (ya filtrados por remoto).
    const filteredResults = useMemo(() => (
        sourceFilter === ALL_MATCH_SOURCES
            ? remoteResults
            : remoteResults.filter(job => job.source === sourceFilter)
    ), [remoteResults, sourceFilter]);

    // Paginacion anterior sin filtros, conservada como referencia de DT-139:
    // const totalPages = Math.max(1, Math.ceil(results.length / AI_MATCH_PAGE_SIZE));
    // const pagedResults = results.slice(page * AI_MATCH_PAGE_SIZE, (page + 1) * AI_MATCH_PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(filteredResults.length / AI_MATCH_PAGE_SIZE));
    const pagedResults = filteredResults.slice(
        page * AI_MATCH_PAGE_SIZE,
        (page + 1) * AI_MATCH_PAGE_SIZE
    );

    // Cambia el filtro de fuente y vuelve a la primera página.
    const selectSource = useCallback((source) => {
        setSourceFilter(source);
        setPage(0);
        setExpandedId(null);
    }, []);

    // Activa o desactiva el filtro "solo ofertas remotas".
    const toggleRemoteOnly = useCallback(() => {
        setRemoteOnly(value => !value);
        setPage(0);
        setExpandedId(null);
    }, []);

    // Traduce al inglés los títulos de la página actual que no se hayan
    // traducido ya (nunca se vuelve a traducir uno que ya tenga traducción).
    const translateTitles = useCallback(async () => {
        const titlesToTranslate = pagedResults
            .map(j => j.title)
            .filter(title => !translatedTitles[title]);
        if (titlesToTranslate.length === 0) return;

        setTranslating(true);
        try {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/translate-titles`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titles: titlesToTranslate }),
                }
            );
            const data = await response.json();
            setTranslatedTitles(prev => ({ ...prev, ...data.translations }));
        } catch (err) {
            console.warn('Translation failed:', err.message);
        } finally {
            setTranslating(false);
        }
    }, [pagedResults, translatedTitles, authenticatedFetch]);

    // Va a la página anterior o siguiente.
    const prevPage = useCallback(() => setPage(p => p - 1), []);
    const nextPage = useCallback(() => setPage(p => p + 1), []);

    // Abre o cierra el detalle de una oferta concreta.
    const toggleExpanded = useCallback((globalIdx) => {
        setExpandedId(prev => (prev === globalIdx ? null : globalIdx));
    }, []);

    // Guarded tab selection: Skills Gap is blocked while the LLM is unavailable
    // (the component keeps the `disabled` attribute for styling/accessibility)
    // Cambia de pestaña, salvo que se intente ir a "habilidades que faltan"
    // mientras la IA no esté disponible.
    const selectTab = useCallback((tab) => {
        if (tab === TAB_SKILLS_GAP && llmUnavailable) return;
        setActiveTab(tab);
    }, [llmUnavailable]);

    return {
        results,
        metadata,
        dataSource,
        loading,
        progress,
        error,
        runAnalysis,
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
        translatedTitles,
        translating,
        translateTitles,
        activeTab,
        selectTab,
        llmUnavailable,
    };
};

export default useAIJobMatch;
