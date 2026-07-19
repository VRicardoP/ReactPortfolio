import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../../Windows/FloatingWindow';
import useJSearchLive from '../../../hooks/useJSearchLive';
import useJobFilter from '../../../hooks/useJobFilter';
import useSavedSearches from '../../../hooks/useSavedSearches';
import useJobApplication from '../../../hooks/useJobApplication';
import LiveSearchPanel from './LiveSearchPanel';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import SavedSearchesPanel from './SavedSearchesPanel';
import '../../../styles/dashboard-forms.css';

// Unified job-search window: merges the former JSearchLive, JobFilter and SavedSearches
// windows into one tabbed window. Each tab keeps the exact behavior of its origin window.
const TABS = [
    { key: 'live', labelKey: 'dashboard.jobSearch.tabLive' },
    { key: 'filter', labelKey: 'dashboard.jobSearch.tabFilter' },
    { key: 'saved', labelKey: 'dashboard.jobSearch.tabSaved' },
];

const JobSearchWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();

    // The three feature hooks are called unconditionally (React rule) and at the top level
    // so each tab's state (form fields, results, expanded rows) survives tab switches —
    // the panels below are purely presentational and mount/unmount without losing state.
    const live = useJSearchLive();
    // onSaveSearch stays undefined on purpose: the filter's "Save search" button was never
    // wired in the standalone window, so passing undefined preserves that inert behavior.
    const filter = useJobFilter(undefined);
    const saved = useSavedSearches();
    // Single apply/save tracker shared by both job-list panels so "applied" state is
    // consistent and persists across tab switches.
    const jobApp = useJobApplication();

    const [activeTab, setActiveTab] = useState('live');

    // WAI-ARIA tab keyboard navigation (ArrowLeft/Right, Home/End)
    const handleTabKeyDown = useCallback((e) => {
        const currentIdx = TABS.findIndex(tab => tab.key === activeTab);
        let nextIdx;

        if (e.key === 'ArrowRight') {
            nextIdx = currentIdx >= TABS.length - 1 ? 0 : currentIdx + 1;
        } else if (e.key === 'ArrowLeft') {
            nextIdx = currentIdx <= 0 ? TABS.length - 1 : currentIdx - 1;
        } else if (e.key === 'Home') {
            nextIdx = 0;
        } else if (e.key === 'End') {
            nextIdx = TABS.length - 1;
        } else {
            return;
        }

        e.preventDefault();
        setActiveTab(TABS[nextIdx].key);
        // Move focus to the newly active tab button
        const buttons = e.currentTarget.querySelectorAll('[role="tab"]');
        buttons[nextIdx]?.focus();
    }, [activeTab]);

    return (
        <FloatingWindow
            id="job-search-window"
            title={t('dashboard.jobSearch.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 680, height: 580 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '10px' }}>
                {/* Tab bar */}
                <div
                    role="tablist"
                    aria-label={t('dashboard.jobSearch.title')}
                    onKeyDown={handleTabKeyDown}
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                >
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            id={`jobsearch-tab-${tab.key}`}
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            aria-controls={`jobsearch-panel-${tab.key}`}
                            tabIndex={activeTab === tab.key ? 0 : -1}
                            className={`dash-tab${activeTab === tab.key ? ' dash-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {t(tab.labelKey)}
                        </button>
                    ))}
                </div>

                {/* Active panel (only the selected tab's panel is mounted) */}
                <div
                    role="tabpanel"
                    id={`jobsearch-panel-${activeTab}`}
                    aria-labelledby={`jobsearch-tab-${activeTab}`}
                    style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
                >
                    {activeTab === 'live' && <LiveSearchPanel live={live} />}
                    {activeTab === 'filter' && <AdvancedFilterPanel filter={filter} jobApp={jobApp} />}
                    {activeTab === 'saved' && <SavedSearchesPanel saved={saved} jobApp={jobApp} />}
                </div>
            </div>
        </FloatingWindow>
    );
});

JobSearchWindow.displayName = 'JobSearchWindow';

export default JobSearchWindow;
