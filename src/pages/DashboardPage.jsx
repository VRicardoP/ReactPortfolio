import { lazy, Suspense, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDashboardData } from '../hooks/useDashboardData';
import useJobBookmarks from '../hooks/useJobBookmarks';
import BackgroundEffect from '../components/Background/BackgroundEffect';
import { WindowProvider } from '../context/WindowContext';
import useTypewriter from '../hooks/useTypewriter';
import useWindowLayout from '../hooks/useWindowLayout';
import { useSSENotifications } from '../hooks/useSSENotifications';
import '../styles/dashboard.css';

// lazy load components only when needed so it's faster
const StatsWindow = lazy(() => import('../components/Dashboard/StatsWindow'));
const MapWindow = lazy(() => import('../components/Dashboard/MapWindow'));
const ChatAnalyticsWindow = lazy(() => import('../components/Dashboard/ChatAnalyticsWindow'));
const RecentVisitorsWindow = lazy(() => import('../components/Dashboard/RecentVisitorsWindow'));
const JobBoardTabbedWindow = lazy(() => import('../components/Dashboard/JobBoardTabbedWindow'));
const JobMarketAnalyticsWindow = lazy(() => import('../components/Dashboard/JobMarketAnalyticsWindow'));
const BookmarkedJobsWindow = lazy(() => import('../components/Dashboard/BookmarkedJobsWindow'));
const JSearchLiveWindow = lazy(() => import('../components/Dashboard/JSearchLiveWindow'));
const SalaryAnalyticsWindow = lazy(() => import('../components/Dashboard/SalaryAnalyticsWindow'));
const SavedSearchesWindow = lazy(() => import('../components/Dashboard/SavedSearchesWindow'));
const JobFilterWindow = lazy(() => import('../components/Dashboard/JobFilterWindow'));
const KanbanWindow = lazy(() => import('../components/Dashboard/KanbanWindow'));
const AIJobMatchWindow = lazy(() => import('../components/Dashboard/AIJobMatchWindow'));

// what is shown while the dashboard is loading
const DashboardLoader = memo(() => (
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
            Loading dashboard...
        </div>
    </div>
));

DashboardLoader.displayName = 'DashboardLoader';

// here are all the dashboard windows
const DashboardContent = memo(({ stats, mapData, chatAnalytics, jobData, bookmarks, removeBookmark }) => {
    // Listen for SSE notifications (new jobs toast, etc.)
    useSSENotifications();

    const dashboardWindowIds = [
        'stats-window',
        'recent-visitors-window',
        'map-window',
        'chat-analytics-window',
        'job-board-window',
        'job-analytics-window',
        'bookmarked-jobs-window',
        'jsearch-live-window',
        'salary-analytics-window',
        'job-filter-window',
        'saved-searches-window',
        'kanban-window',
        'ai-match-window'
    ];

    useWindowLayout(dashboardWindowIds, 1500);

    return (
        <Suspense fallback={<DashboardLoader />}>
            <StatsWindow
                data={stats}
                initialPosition={{ x: 100, y: 120 }}
            />

            <RecentVisitorsWindow
                data={stats}
                initialPosition={{ x: 130, y: 130 }}
            />

            <MapWindow
                data={mapData}
                initialPosition={{ x: 160, y: 140 }}
            />

            <ChatAnalyticsWindow
                data={chatAnalytics}
                initialPosition={{ x: 190, y: 150 }}
            />

            <JobBoardTabbedWindow
                jobData={jobData}
                initialPosition={{ x: 220, y: 160 }}
            />

            <JobMarketAnalyticsWindow
                jobData={jobData}
                initialPosition={{ x: 250, y: 170 }}
            />

            <BookmarkedJobsWindow
                bookmarks={bookmarks}
                onRemove={removeBookmark}
                initialPosition={{ x: 280, y: 180 }}
            />

            <JSearchLiveWindow
                initialPosition={{ x: 310, y: 190 }}
            />

            <SalaryAnalyticsWindow
                data={jobData.jsearch}
                initialPosition={{ x: 340, y: 200 }}
            />

            <JobFilterWindow
                initialPosition={{ x: 370, y: 210 }}
            />

            <SavedSearchesWindow
                initialPosition={{ x: 400, y: 220 }}
            />

            <KanbanWindow
                initialPosition={{ x: 430, y: 230 }}
            />

            <AIJobMatchWindow
                initialPosition={{ x: 460, y: 240 }}
            />
        </Suspense>
    );
});

DashboardContent.displayName = 'DashboardContent';

const BACKGROUND_LABELS = {
    rain: 'bgRain',
    parallax: 'bgParallax',
    matrix: 'bgMatrix',
    lensflare: 'bgLensflare',
    cube: 'bgCube',
    smoke: 'bgSmoke',
};

const BACKGROUND_EMOJIS = {
    rain: '🌧️',
    parallax: '✨',
    matrix: '🟩',
    lensflare: '🌟',
    cube: '🧊',
    smoke: '💨',
};

const DashboardPage = () => {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const { theme, cycleTheme, themeName, backgroundEffect, cycleBackground } = useTheme();
    const navigate = useNavigate();
    const typedText = useTypewriter(t('dashboard.title'), 100);
    const { stats, mapData, chatAnalytics, recentJobs, remotiveRecentJobs, arbeitnowRecentJobs, jsearchRecentJobs, remoteokRecentJobs, himalayasRecentJobs, adzunaRecentJobs, weworkremotelyRecentJobs, loading, error } = useDashboardData();
    const { bookmarks, removeBookmark } = useJobBookmarks();

    // functions for the buttons
    const handleLogout = useCallback(() => {
        logout();
        navigate('/login');
    }, [logout, navigate]);

    const handleGoHome = useCallback(() => {
        navigate('/');
    }, [navigate]);

    // while loading data show this
    if (loading) {
        return (
            <>
                <BackgroundEffect />
                <div className="dashboard-header">
                    <h1 className="main-title">
                        <span className="typewriter-container">{t('dashboard.loading')}</span>
                        <span className="terminal-cursor"></span>
                    </h1>
                </div>
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#00ffff',
                    fontFamily: 'Courier New',
                    zIndex: 100
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                    <p style={{ fontSize: '18px' }}>{t('dashboard.fetchingData')}</p>
                </div>
            </>
        );
    }

    // if there's a problem show this error
    if (error) {
        return (
            <>
                <BackgroundEffect />
                <div className="dashboard-header">
                    <h1 className="main-title">
                        <span className="typewriter-container">{t('dashboard.error')}</span>
                        <span className="terminal-cursor"></span>
                    </h1>
                    <div className="dashboard-nav">
                        <button onClick={handleGoHome} className="nav-button">
                            {t('dashboard.backToPortfolio')}
                        </button>
                        <button onClick={handleLogout} className="nav-button logout">
                            {t('dashboard.logout')}
                        </button>
                    </div>
                </div>
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#ff6b6b',
                    fontFamily: 'Courier New',
                    zIndex: 100,
                    maxWidth: '90%',
                    padding: '30px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '2px solid #ff6b6b',
                    borderRadius: '8px'
                }}>
                    <h2 style={{ marginTop: 0 }}>{t('dashboard.failedToLoad')}</h2>
                    <p style={{ fontSize: '16px', margin: '20px 0' }}>{error}</p>
                    <div style={{
                        fontSize: '14px',
                        marginTop: '30px',
                        padding: '15px',
                        background: 'rgba(255, 107, 107, 0.1)',
                        borderRadius: '4px',
                        color: '#D3D3D3'
                    }}>
                        <strong>{t('dashboard.troubleshooting')}</strong>
                        <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                            <li>{t('dashboard.checkBackend')}</li>
                            <li>{t('dashboard.checkCredentials')}</li>
                            <li>{t('dashboard.checkConsole')}</li>
                            <li>{t('dashboard.checkCors')}</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#00ffff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontFamily: 'Courier New',
                            fontWeight: 'bold'
                        }}
                    >
                        {t('dashboard.retry')}
                    </button>
                </div>
            </>
        );
    }

    const bgKey = BACKGROUND_LABELS[backgroundEffect] || 'bgRain';
    const bgEmoji = BACKGROUND_EMOJIS[backgroundEffect] || '🌧️';

    // when everything is ready show the complete dashboard
    return (
        <>
            <BackgroundEffect />

            <div className="dashboard-header">
                <h1 className="main-title">
                    <span className="typewriter-container">{typedText}</span>
                    <span className="terminal-cursor"></span>
                </h1>

                <div className="dashboard-nav">
                    <button
                        onClick={cycleTheme}
                        className="nav-button theme-button"
                        title={`${t('dashboard.theme')}: ${theme.name}`}
                        style={{
                            backgroundColor: theme.primary,
                            color: '#000',
                            border: `1px solid ${theme.primary}`
                        }}
                    >
                        {themeName === 'cyan' ? '🔵' : themeName === 'silver' ? '⚪' : '🟠'} {t('dashboard.theme')}
                    </button>
                    <button
                        onClick={cycleBackground}
                        className="nav-button theme-button"
                        title={`${t(`dashboard.${bgKey}`)}`}
                        style={{
                            backgroundColor: 'transparent',
                            color: theme.primary,
                            border: `1px solid ${theme.primary}`
                        }}
                    >
                        {bgEmoji} {t(`dashboard.${bgKey}`)}
                    </button>
                    <button onClick={handleGoHome} className="nav-button">
                        {t('dashboard.backToPortfolio')}
                    </button>
                    <button onClick={handleLogout} className="nav-button logout">
                        {t('dashboard.logout')}
                    </button>
                </div>
            </div>

            <WindowProvider>
                <DashboardContent
                    stats={stats}
                    mapData={mapData}
                    chatAnalytics={chatAnalytics}
                    jobData={{
                        jobicy: recentJobs,
                        remotive: remotiveRecentJobs,
                        arbeitnow: arbeitnowRecentJobs,
                        jsearch: jsearchRecentJobs,
                        remoteok: remoteokRecentJobs,
                        himalayas: himalayasRecentJobs,
                        adzuna: adzunaRecentJobs,
                        weworkremotely: weworkremotelyRecentJobs,
                    }}
                    bookmarks={bookmarks}
                    removeBookmark={removeBookmark}
                />
            </WindowProvider>
        </>
    );
};

export default DashboardPage;
