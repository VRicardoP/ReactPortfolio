// Ventana única de búsqueda de empleo con tres pestañas (búsqueda en vivo,
// filtro avanzado, búsquedas guardadas), que antes eran tres ventanas
// separadas. Cada pestaña guarda su propio estado aunque se cambie de pestaña.

import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../../Windows/FloatingWindow';
import TabBar from '../../UI/TabBar';
import useJSearchLive from '../../../hooks/useJSearchLive';
import useJobFilter from '../../../hooks/useJobFilter';
import useSavedSearches from '../../../hooks/useSavedSearches';
import useJobApplication from '../../../hooks/useJobApplication';
import LiveSearchPanel from './LiveSearchPanel';
import AdvancedFilterPanel from './AdvancedFilterPanel';
import SavedSearchesPanel from './SavedSearchesPanel';
import '../../../styles/dashboard-forms.css';
import { WINDOW_SIZES } from '../../../config/windowSizes';

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

    return (
        <FloatingWindow
            id="job-search-window"
            title={t('dashboard.jobSearch.title')}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.jobSearch}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '10px' }}>
                {/* Tab bar */}
                <TabBar
                    ariaLabel={t('dashboard.jobSearch.title')}
                    className="job-search-tabs"
                    tabClassName="dash-tab"
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                    activeClassName="dash-tab--active"
                    active={activeTab}
                    onChange={setActiveTab}
                    tabs={TABS.map(tab => ({
                        key: tab.key,
                        label: t(tab.labelKey),
                        id: `jobsearch-tab-${tab.key}`,
                        controls: `jobsearch-panel-${tab.key}`,
                    }))}
                />

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
