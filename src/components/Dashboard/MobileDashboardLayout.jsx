// Versión móvil del panel de administración: en vez de ventanas flotantes,
// una barra de pestañas abajo (resumen, mapa, chat, ofertas, ajustes) que
// muestra una sección a la vez.

import { lazy, Suspense, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useSSEEvents } from '../../hooks/useSSEEvents';
import { DashboardLoader } from './DesktopDashboardContent';
import { DASHBOARD_TABS } from './dashboardConstants';
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

// Mobile: tabbed layout with collapsible sections
const MobileDashboardLayout = memo(({
    stats, mapData, chatAnalytics, jobData,
    onLogout, onGoHome,
}) => {
    const { t } = useTranslation();
    const { theme, cycleTheme, cycleBackground, backgroundEffect } = useTheme();
    const [activeTab, setActiveTab] = useState('overview');

    useSSEEvents();

    return (
        <>
            <nav className="mobile-nav-header">
                <span className="mobile-nav-title">{t('dashboard.title')}</span>
            </nav>

            <div className="mobile-dashboard-container">
                <div className="mobile-dashboard-content">
                    {activeTab === 'overview' && (
                        <Suspense fallback={<DashboardLoader />}>
                            {/* DT-128: un ErrorBoundary POR ventana, como en escritorio. */}
                            <ErrorBoundary><StatsWindow data={stats} defaultExpanded /></ErrorBoundary>
                            <ErrorBoundary><RecentVisitorsWindow data={stats} /></ErrorBoundary>
                            <ErrorBoundary><HeatmapWindow /></ErrorBoundary>
                        </Suspense>
                    )}

                    {activeTab === 'map' && (
                        <ErrorBoundary>
                            <Suspense fallback={<DashboardLoader />}>
                                <MapWindow data={mapData} defaultExpanded />
                            </Suspense>
                        </ErrorBoundary>
                    )}

                    {activeTab === 'chat' && (
                        <ErrorBoundary>
                            <Suspense fallback={<DashboardLoader />}>
                                <ChatAnalyticsWindow data={chatAnalytics} defaultExpanded />
                            </Suspense>
                        </ErrorBoundary>
                    )}

                    {activeTab === 'jobs' && (
                        <Suspense fallback={<DashboardLoader />}>
                            <ErrorBoundary><JobBoardTabbedWindow jobData={jobData} defaultExpanded /></ErrorBoundary>
                            <ErrorBoundary><JobMarketAnalyticsWindow jobData={jobData} /></ErrorBoundary>
                            <ErrorBoundary><SelectedOffersPanel /></ErrorBoundary>
                            <ErrorBoundary><JobSearchWindow /></ErrorBoundary>
                            <ErrorBoundary><AIJobMatchWindow /></ErrorBoundary>
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
                                            <span
                                                className="mobile-theme-swatch"
                                                style={{ backgroundColor: theme.primary }}
                                                aria-hidden="true"
                                            />
                                            {t('dashboard.theme')}
                                        </button>
                                        <button
                                            className="mobile-nav-dropdown-item"
                                            onClick={cycleBackground}
                                        >
                                            <span className="mobile-nav-dropdown-item-icon" aria-hidden="true">BG</span>
                                            {t(`dashboard.${backgroundEffect === 'rain' ? 'bgRain' : backgroundEffect === 'parallax' ? 'bgParallax' : backgroundEffect === 'matrix' ? 'bgMatrix' : backgroundEffect === 'lensflare' ? 'bgLensflare' : backgroundEffect === 'cube' ? 'bgCube' : 'bgSmoke'}`)}
                                        </button>
                                        <button
                                            className="mobile-nav-dropdown-item"
                                            onClick={onGoHome}
                                        >
                                            <span className="mobile-nav-dropdown-item-icon" aria-hidden="true">HOME</span>
                                            {t('dashboard.backToPortfolio')}
                                        </button>
                                        <button
                                            className="mobile-nav-dropdown-item"
                                            onClick={onLogout}
                                            style={{ color: '#ff6b6b' }}
                                        >
                                            <span className="mobile-nav-dropdown-item-icon" aria-hidden="true">EXIT</span>
                                            {t('dashboard.logout')}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>

            <div className="mobile-dashboard-tabs">
                {DASHBOARD_TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`mobile-dashboard-tab${activeTab === tab.key ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span className="mobile-dashboard-tab-icon" aria-hidden="true">{tab.icon}</span>
                        <span>{t(`dashboard.tab.${tab.key}`)}</span>
                    </button>
                ))}
            </div>
        </>
    );
});

MobileDashboardLayout.displayName = 'MobileDashboardLayout';

export default MobileDashboardLayout;
