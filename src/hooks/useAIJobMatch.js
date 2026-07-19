import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { AI_MATCH_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';

export const TAB_RESULTS = 'results';
export const TAB_SKILLS_GAP = 'skills-gap';

// The analysis runs server-side in background: polling this often is cheap
// (a tiny JSON) and keeps the progress bar responsive.
const POLL_INTERVAL_MS = 2500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
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

    const [results, setResults] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [translatedTitles, setTranslatedTitles] = useState({});
    const [translating, setTranslating] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_RESULTS);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const llmUnavailable = results.length > 0 && results.some(j => j.llm_unavailable);

    // If the LLM re-ranking becomes unavailable while Skills Gap is open,
    // force the user back to the Results tab
    useEffect(() => {
        if (llmUnavailable && activeTab === TAB_SKILLS_GAP) {
            setActiveTab(TAB_RESULTS);
        }
    }, [llmUnavailable, activeTab]);

    /** Load the latest persisted result. Returns true when one was available. */
    const fetchResult = useCallback(async () => {
        const response = await authenticatedFetch(
            `${BACKEND_URL}/api/v1/ai-match/analyze/result`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!payload.available || !payload.data || !mountedRef.current) return false;
        setResults(payload.data.results || []);
        setMetadata(payload.data.metadata || null);
        setPage(0);
        return true;
    }, [authenticatedFetch]);

    /** Poll /analyze/progress until the background run ends, then load the result. */
    const followRunningAnalysis = useCallback(async () => {
        for (;;) {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/analyze/progress`
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const state = await response.json();
            if (!mountedRef.current) return;
            setProgress(state);
            if (state.state === 'done') {
                await fetchResult();
                return;
            }
            if (state.state === 'error') {
                throw new Error(state.error || 'Analysis failed');
            }
            await sleep(POLL_INTERVAL_MS);
            if (!mountedRef.current) return;
        }
    }, [authenticatedFetch, fetchResult]);

    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        setProgress(null);
        try {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/analyze/start?force=true`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            // status: started | already_running — either way, follow the run
            await response.json();
            await followRunningAnalysis();
        } catch (err) {
            if (mountedRef.current) setError(err.message || 'Analysis failed');
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setProgress(null);
            }
        }
    }, [authenticatedFetch, followRunningAnalysis]);

    // On mount: show the stored result instantly; if a background analysis is
    // already running (post-deploy warm-up, another session), attach to it.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await fetchResult();
                const response = await authenticatedFetch(
                    `${BACKEND_URL}/api/v1/ai-match/analyze/progress`
                );
                if (!response.ok || cancelled) return;
                const state = await response.json();
                if (state.state === 'running' && !cancelled) {
                    setLoading(true);
                    setProgress(state);
                    try {
                        await followRunningAnalysis();
                    } finally {
                        if (mountedRef.current) {
                            setLoading(false);
                            setProgress(null);
                        }
                    }
                }
            } catch {
                // Silent: no stored result yet is a normal first-visit state
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totalPages = Math.max(1, Math.ceil(results.length / AI_MATCH_PAGE_SIZE));
    const pagedResults = results.slice(page * AI_MATCH_PAGE_SIZE, (page + 1) * AI_MATCH_PAGE_SIZE);

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
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setTranslatedTitles(prev => ({ ...prev, ...data.translations }));
        } catch (err) {
            console.warn('Translation failed:', err.message);
        } finally {
            setTranslating(false);
        }
    }, [pagedResults, translatedTitles, authenticatedFetch]);

    const prevPage = useCallback(() => setPage(p => p - 1), []);
    const nextPage = useCallback(() => setPage(p => p + 1), []);

    const toggleExpanded = useCallback((globalIdx) => {
        setExpandedId(prev => (prev === globalIdx ? null : globalIdx));
    }, []);

    // Guarded tab selection: Skills Gap is blocked while the LLM is unavailable
    // (the component keeps the `disabled` attribute for styling/accessibility)
    const selectTab = useCallback((tab) => {
        if (tab === TAB_SKILLS_GAP && llmUnavailable) return;
        setActiveTab(tab);
    }, [llmUnavailable]);

    return {
        results,
        metadata,
        loading,
        progress,
        error,
        runAnalysis,
        page,
        totalPages,
        pagedResults,
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
