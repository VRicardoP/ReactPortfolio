import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { AI_MATCH_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';

export const TAB_RESULTS = 'results';
export const TAB_SKILLS_GAP = 'skills-gap';

// Analyze pipeline parameters: embeddings top-k, LLM re-rank pool, LLM batch size
const ANALYZE_PARAMS = 'top_k=50&rerank_top=30&batch_size=10';

/**
 * State + logic for the AI job match window: analysis lifecycle, pagination,
 * per-card expansion, batch title translation and tab selection.
 * Extracted from AIJobMatchWindow (component renders UI only).
 *
 * Behavior notes preserved from the original inline logic:
 * - `page` resets to 0 only on a SUCCESSFUL analysis (errors keep the page).
 * - `translatedTitles` merges additively and is never cleared — translations
 *   survive re-analysis and page changes. Translation failures are silent
 *   (console.warn), never routed into the analyze `error` state.
 * - `expandedId` is a global slot index (page * pageSize + idx), not a job id.
 */
const useAIJobMatch = () => {
    const { authenticatedFetch } = useAuth();

    const [results, setResults] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const [translatedTitles, setTranslatedTitles] = useState({});
    const [translating, setTranslating] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_RESULTS);

    const llmUnavailable = results.length > 0 && results.some(j => j.llm_unavailable);

    // If the LLM re-ranking becomes unavailable while Skills Gap is open,
    // force the user back to the Results tab
    useEffect(() => {
        if (llmUnavailable && activeTab === TAB_SKILLS_GAP) {
            setActiveTab(TAB_RESULTS);
        }
    }, [llmUnavailable, activeTab]);

    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/analyze?${ANALYZE_PARAMS}`
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setResults(data.results || []);
            setMetadata(data.metadata || null);
            setPage(0);
        } catch (err) {
            setError(err.message || 'Analysis failed');
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch]);

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
