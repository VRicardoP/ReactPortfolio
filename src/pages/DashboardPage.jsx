import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDashboardData } from '../hooks/useDashboardData';
import BackgroundEffect from '../components/Background/BackgroundEffect';
import { WindowProvider } from '../context/WindowContext';
import useTypewriter from '../hooks/useTypewriter';
import useIsMobile from '../hooks/useIsMobile';
import DesktopDashboardContent from '../components/Dashboard/DesktopDashboardContent';
import MobileDashboardLayout from '../components/Dashboard/MobileDashboardLayout';
import '../styles/dashboard.css';
import '../styles/mobile.css';
import '../styles/cv-generation.css';

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
    const isMobile = useIsMobile();
    const typedText = useTypewriter(t('dashboard.title'), 100);
    const { stats, mapData, chatAnalytics, jobData, loading, error } = useDashboardData();

    // Functions for the buttons
    const handleLogout = useCallback(() => {
        logout();
        navigate('/login');
    }, [logout, navigate]);

    const handleGoHome = useCallback(() => {
        navigate('/');
    }, [navigate]);

    // While loading data show this
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

    // If there's a problem show this error
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

    // Mobile dashboard: tabbed layout
    if (isMobile) {
        return (
            <MobileDashboardLayout
                stats={stats}
                mapData={mapData}
                chatAnalytics={chatAnalytics}
                jobData={jobData}
                onLogout={handleLogout}
                onGoHome={handleGoHome}
            />
        );
    }

    const bgKey = BACKGROUND_LABELS[backgroundEffect] || 'bgRain';
    const bgEmoji = BACKGROUND_EMOJIS[backgroundEffect] || '🌧️';

    // Desktop: floating windows dashboard
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
                <DesktopDashboardContent
                    stats={stats}
                    mapData={mapData}
                    chatAnalytics={chatAnalytics}
                    jobData={jobData}
                />
            </WindowProvider>
        </>
    );
};

export default DashboardPage;
