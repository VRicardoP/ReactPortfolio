import { lazy, Suspense, memo } from 'react';
import { useTranslation } from 'react-i18next';
import useWindowLayout from '../../hooks/useWindowLayout';
import { useSSENotifications } from '../../hooks/useSSENotifications';
import useSchoolJobs from '../../hooks/useSchoolJobs';
import ErrorBoundary from '../ErrorBoundary';

// Lazy load dashboard window components
const StatsWindow = lazy(() => import('./StatsWindow'));
const MapWindow = lazy(() => import('./MapWindow'));
const ChatAnalyticsWindow = lazy(() => import('./ChatAnalyticsWindow'));
const RecentVisitorsWindow = lazy(() => import('./RecentVisitorsWindow'));
const JobBoardTabbedWindow = lazy(() => import('./JobBoardTabbedWindow'));
const JobMarketAnalyticsWindow = lazy(() => import('./JobMarketAnalyticsWindow'));
const SelectedOffersPanel = lazy(() => import('./SelectedOffersPanel'));
const JobSearchWindow = lazy(() => import('./JobSearchWindow'));
const AIJobMatchWindow = lazy(() => import('./AIJobMatchWindow'));
const HeatmapWindow = lazy(() => import('./HeatmapWindow'));
const SchoolJobsWindow = lazy(() => import('./SchoolJobsWindow'));
const SchoolManualContactsWindow = lazy(() => import('./SchoolManualContactsWindow'));

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
    'job-search-window',
    'ai-match-window',
    'heatmap-window',
    'school-jobs-window',
    'school-manual-contacts-window',
];

const LAYOUT_ANIMATION_DELAY_MS = 600;

// Desktop: floating windows with drag/resize/minimize
const DesktopDashboardContent = memo(({
    stats, mapData, chatAnalytics, jobData,
}) => {
    // Listen for SSE notifications (new jobs toast, etc.)
    useSSENotifications();

    // Fetch schools + detected jobs ONCE here and share with both school windows
    // (avoids the duplicate GETs from each window calling the hook — DT-98).
    const schoolData = useSchoolJobs();

    useWindowLayout(DASHBOARD_WINDOW_IDS, LAYOUT_ANIMATION_DELAY_MS);

    return (
        <>
            {/* DT-128: UN ErrorBoundary POR VENTANA. Antes había uno por GRUPO, así
                que el TypeError de una sola (DT-127, en el Kanban que importa
                SelectedOffersPanel) se llevaba las otras tres del grupo «Jobs»:
                Job Board, Job Search y AI Job Match funcionaban y no se veían.
                El Suspense sigue compartido: la carga diferida no es un fallo. */}
            <Suspense fallback={<DashboardLoader />}>
                {/* Overview group */}
                <ErrorBoundary>
                    <StatsWindow
                        data={stats}
                        initialPosition={{ x: 100, y: 120 }}
                    />
                </ErrorBoundary>
                <ErrorBoundary>
                    <RecentVisitorsWindow
                        data={stats}
                        initialPosition={{ x: 130, y: 130 }}
                    />
                </ErrorBoundary>

                {/* Map group */}
                <ErrorBoundary>
                    <MapWindow
                        data={mapData}
                        initialPosition={{ x: 160, y: 140 }}
                    />
                </ErrorBoundary>

                {/* Analytics group */}
                <ErrorBoundary>
                    <ChatAnalyticsWindow
                        data={chatAnalytics}
                        initialPosition={{ x: 190, y: 150 }}
                    />
                </ErrorBoundary>
                <ErrorBoundary>
                    <JobMarketAnalyticsWindow
                        jobData={jobData}
                        initialPosition={{ x: 250, y: 170 }}
                    />
                </ErrorBoundary>
                <ErrorBoundary>
                    <HeatmapWindow
                        initialPosition={{ x: 310, y: 190 }}
                    />
                </ErrorBoundary>

                {/* Jobs group */}
                <ErrorBoundary>
                    <JobBoardTabbedWindow
                        jobData={jobData}
                        initialPosition={{ x: 220, y: 160 }}
                    />
                </ErrorBoundary>
                <ErrorBoundary>
                    <SelectedOffersPanel
                        initialPosition={{ x: 280, y: 180 }}
                    />
                </ErrorBoundary>
                <ErrorBoundary>
                    <JobSearchWindow
                        initialPosition={{ x: 370, y: 210 }}
                    />
                </ErrorBoundary>
                <ErrorBoundary>
                    <AIJobMatchWindow
                        initialPosition={{ x: 520, y: 260 }}
                    />
                </ErrorBoundary>

                {/* Schools group */}
                <ErrorBoundary>
                    <SchoolJobsWindow
                        schoolData={schoolData}
                        initialPosition={{ x: 340, y: 200 }}
                    />
                </ErrorBoundary>
                <ErrorBoundary>
                    <SchoolManualContactsWindow
                        schoolData={schoolData}
                        initialPosition={{ x: 400, y: 220 }}
                    />
                </ErrorBoundary>
            </Suspense>
        </>
    );
});

DesktopDashboardContent.displayName = 'DesktopDashboardContent';

export default DesktopDashboardContent;
