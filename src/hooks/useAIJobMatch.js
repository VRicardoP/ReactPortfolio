import { useCallback, useEffect, useState } from 'react';

import { ADMIN_BACKEND_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import useAnalysisRun from './useAnalysisRun';
import useAuthenticatedQuery from './useAuthenticatedQuery';
import useMatchResultsView, { ALL_MATCH_SOURCES } from './useMatchResultsView';

export const TAB_RESULTS = 'results';
export const TAB_SKILLS_GAP = 'skills-gap';
export { ALL_MATCH_SOURCES };

// Compone el ciclo del análisis, la vista de resultados y las acciones de
// traducción/pestañas que consume AIJobMatchWindow.
const useAIJobMatch = () => {
    const { authenticatedFetch } = useAuth();
    const { refetch: refetchResult } = useAuthenticatedQuery(
        `${ADMIN_BACKEND_URL}/api/v1/ai-match/analyze/result`,
        { enabled: false, throwOnError: true },
    );
    const analysis = useAnalysisRun(authenticatedFetch, refetchResult);
    const view = useMatchResultsView(analysis.results);

    const [translatedTitles, setTranslatedTitles] = useState({});
    const [translating, setTranslating] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_RESULTS);

    const llmUnavailable = analysis.results.length > 0
        && analysis.results.some(job => job.llm_unavailable);

    useEffect(() => {
        if (llmUnavailable && activeTab === TAB_SKILLS_GAP) {
            setActiveTab(TAB_RESULTS);
        }
    }, [llmUnavailable, activeTab]);

    const translateTitles = useCallback(async () => {
        const titlesToTranslate = view.pagedResults
            .map(job => job.title)
            .filter(title => !translatedTitles[title]);
        if (titlesToTranslate.length === 0) return;

        setTranslating(true);
        try {
            const response = await authenticatedFetch(
                `${ADMIN_BACKEND_URL}/api/v1/ai-match/translate-titles`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titles: titlesToTranslate }),
                }
            );
            const data = await response.json();
            setTranslatedTitles(current => ({ ...current, ...data.translations }));
        } catch (err) {
            console.warn('Translation failed:', err.message);
        } finally {
            setTranslating(false);
        }
    }, [authenticatedFetch, translatedTitles, view.pagedResults]);

    const selectTab = useCallback((tab) => {
        if (tab === TAB_SKILLS_GAP && llmUnavailable) return;
        setActiveTab(tab);
    }, [llmUnavailable]);

    return {
        ...analysis,
        ...view,
        translatedTitles,
        translating,
        translateTitles,
        activeTab,
        selectTab,
        llmUnavailable,
    };
};

export default useAIJobMatch;
