import { lazy, Suspense, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useSSENotifications } from '../../hooks/useSSENotifications';
import { DashboardLoader } from './DesktopDashboardContent';
import { DASHBOARD_TABS } from './dashboardConstants';
import Toast from '../UI/Toast';

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

// Mobile: tabbed layout with collapsible sections
const MobileDashboardLayout = memo(({
    stats, mapData, chatAnalytics, jobData,
    onLogout, onGoHome,
}) => {
    const { t } = useTranslation();
    const { cycleTheme, themeName, cycleBackground, backgroundEffect } = useTheme();
    const [activeTab, setActiveTab] = useState('overview');

    useSSENotifications();

    return (
        <>
            <nav className="mobile-nav-header">
                <span className="mobile-nav-title">{t('dashboard.title')}</span>
            </nav>

            <div className="mobile-dashboard-container">
                <div className="mobile-dashboard-content">
                    {activeTab === 'overview' && (
                        <Suspense fallback={<DashboardLoader />}>
                            <StatsWindow data={stats} defaultExpanded />
                            <RecentVisitorsWindow data={stats} />
                        </Suspense>
                    )}

                    {activeTab === 'map' && (
                        <Suspense fallback={<DashboardLoader />}>
                            <MapWindow data={mapData} defaultExpanded />
                        </Suspense>
                    )}

                    {activeTab === 'chat' && (
                        <Suspense fallback={<DashboardLoader />}>
                            <ChatAnalyticsWindow data={chatAnalytics} defaultExpanded />
                        </Suspense>
                    )}

                    {activeTab === 'jobs' && (
                        <Suspense fallback={<DashboardLoader />}>
                            <JobBoardTabbedWindow jobData={jobData} defaultExpanded />
                            <JobMarketAnalyticsWindow jobData={jobData} />
                            <SelectedOffersPanel />
                            <JSearchLiveWindow />
                            <SalaryAnalyticsWindow data={jobData.jsearch} />
                            <JobFilterWindow />
                            <SavedSearchesWindow />
                            <AIJobMatchWindow />
                        </Suspense>
                    )}

                    {activeTab === 'settings' && (
                        <div className="mobile-portfolio-container" style={{ padding: '12px' }}>
                            <section className="mobile-section mobile-section-expanded">
                                <div className="mobile-section-content">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <button
                                            className="mobile-nav-dropdown-item"
                                            onClick={cycleTheme}
                                        >
                                            <span className="mobile-nav-dropdown-item-icon">
                                                {themeName === 'cyan' ? '🔵' : themeName === 'silver' ? '⚪' : '🟠'}
                                            </span>
                                            {t('dashboard.theme')}
                                        </button>
                                        <button
                                            className="mobile-nav-dropdown-item"
                                            onClick={cycleBackground}
                                        >
                                            <span className="mobile-nav-dropdown-item-icon">🎨</span>
                                            {t(`dashboard.${backgroundEffect === 'rain' ? 'bgRain' : backgroundEffect === 'parallax' ? 'bgParallax' : backgroundEffect === 'matrix' ? 'bgMatrix' : backgroundEffect === 'lensflare' ? 'bgLensflare' : backgroundEffect === 'cube' ? 'bgCube' : 'bgSmoke'}`)}
                                        </button>
                                        <button
                                            className="mobile-nav-dropdown-item"
                                            onClick={onGoHome}
                                        >
                                            <span className="mobile-nav-dropdown-item-icon">🏠</span>
                                            {t('dashboard.backToPortfolio')}
                                        </button>
                                        <button
                                            className="mobile-nav-dropdown-item"
                                            onClick={onLogout}
                                            style={{ color: '#ff6b6b' }}
                                        >
                                            <span className="mobile-nav-dropdown-item-icon">🚪</span>
                                            {t('dashboard.logout')}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>

            <Toast />

            <div className="mobile-dashboard-tabs">
                {DASHBOARD_TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`mobile-dashboard-tab${activeTab === tab.key ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span className="mobile-dashboard-tab-icon">{tab.icon}</span>
                        <span>{t(`dashboard.tab.${tab.key}`)}</span>
                    </button>
                ))}
            </div>
        </>
    );
});

MobileDashboardLayout.displayName = 'MobileDashboardLayout';

export default MobileDashboardLayout;
