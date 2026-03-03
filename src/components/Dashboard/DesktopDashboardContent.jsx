import { lazy, Suspense, memo } from 'react';
import { useTranslation } from 'react-i18next';
import useWindowLayout from '../../hooks/useWindowLayout';
import { useSSENotifications } from '../../hooks/useSSENotifications';
import ErrorBoundary from '../ErrorBoundary';

// Lazy load dashboard window components
const StatsWindow = lazy(() => import('./StatsWindow'));
const MapWindow = lazy(() => import('./MapWindow'));
const ChatAnalyticsWindow = lazy(() => import('./ChatAnalyticsWindow'));
const RecentVisitorsWindow = lazy(() => import('./RecentVisitorsWindow'));
const JobBoardTabbedWindow = lazy(() => import('./JobBoardTabbedWindow'));
const JobMarketAnalyticsWindow = lazy(() => import('./JobMarketAnalyticsWindow'));
const SelectedOffersPanel = lazy(() => import('./SelectedOffersPanel'));
const JSearchLiveWindow = lazy(() => import('./JSearchLiveWindow'));
const SalaryAnalyticsWindow = lazy(() => import('./SalaryAnalyticsWindow'));
const SavedSearchesWindow = lazy(() => import('./SavedSearchesWindow'));
const JobFilterWindow = lazy(() => import('./JobFilterWindow'));
const AIJobMatchWindow = lazy(() => import('./AIJobMatchWindow'));

// What is shown while the dashboard is loading
export const DashboardLoader = memo(() => {
    const { t } = useTranslation();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#00ffff',
            fontFamily: 'Courier New',
            fontSize: '14px'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: '24px',
                    marginBottom: '10px',
                    animation: 'pulse 1.5s infinite'
                }}>
                    📊
                </div>
                {t('dashboard.loading')}
            </div>
        </div>
    );
});

DashboardLoader.displayName = 'DashboardLoader';

const DASHBOARD_WINDOW_IDS = [
    'stats-window',
    'recent-visitors-window',
    'map-window',
    'chat-analytics-window',
    'job-board-window',
    'job-analytics-window',
    'selected-offers-panel',
    'jsearch-live-window',
    'salary-analytics-window',
    'job-filter-window',
    'saved-searches-window',
    'ai-match-window',
];

const LAYOUT_ANIMATION_DELAY_MS = 600;

// Desktop: floating windows with drag/resize/minimize
const DesktopDashboardContent = memo(({
    stats, mapData, chatAnalytics, jobData,
}) => {
    // Listen for SSE notifications (new jobs toast, etc.)
    useSSENotifications();

    useWindowLayout(DASHBOARD_WINDOW_IDS, LAYOUT_ANIMATION_DELAY_MS);

    return (
        <>
            {/* Overview group */}
            <ErrorBoundary>
                <Suspense fallback={<DashboardLoader />}>
                    <StatsWindow
                        data={stats}
                        initialPosition={{ x: 100, y: 120 }}
                    />
                    <RecentVisitorsWindow
                        data={stats}
                        initialPosition={{ x: 130, y: 130 }}
                    />
                </Suspense>
            </ErrorBoundary>

            {/* Map group */}
            <ErrorBoundary>
                <Suspense fallback={<DashboardLoader />}>
                    <MapWindow
                        data={mapData}
                        initialPosition={{ x: 160, y: 140 }}
                    />
                </Suspense>
            </ErrorBoundary>

            {/* Analytics group */}
            <ErrorBoundary>
                <Suspense fallback={<DashboardLoader />}>
                    <ChatAnalyticsWindow
                        data={chatAnalytics}
                        initialPosition={{ x: 190, y: 150 }}
                    />
                    <JobMarketAnalyticsWindow
                        jobData={jobData}
                        initialPosition={{ x: 250, y: 170 }}
                    />
                </Suspense>
            </ErrorBoundary>

            {/* Jobs group */}
            <ErrorBoundary>
                <Suspense fallback={<DashboardLoader />}>
                    <JobBoardTabbedWindow
                        jobData={jobData}
                        initialPosition={{ x: 220, y: 160 }}
                    />
                    <SelectedOffersPanel
                        initialPosition={{ x: 280, y: 180 }}
                    />
                    <JSearchLiveWindow
                        initialPosition={{ x: 370, y: 210 }}
                    />
                    <SalaryAnalyticsWindow
                        data={jobData.jsearch}
                        initialPosition={{ x: 400, y: 220 }}
                    />
                    <JobFilterWindow
                        initialPosition={{ x: 430, y: 230 }}
                    />
                    <SavedSearchesWindow
                        initialPosition={{ x: 460, y: 240 }}
                    />
                    <AIJobMatchWindow
                        initialPosition={{ x: 520, y: 260 }}
                    />
                </Suspense>
            </ErrorBoundary>
        </>
    );
});

DesktopDashboardContent.displayName = 'DesktopDashboardContent';

export default DesktopDashboardContent;
