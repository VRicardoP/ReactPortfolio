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
import '../styles/dashboard-layout.css';
import '../styles/dashboard-jobboard.css';
import '../styles/dashboard-job-extras.css';
import '../styles/mobile.css';
import '../styles/cv-generation.css';

// Orquestador del panel de control: pide todos los datos del dashboard,
// muestra una pantalla de carga o de error si hace falta, y luego decide
// si mostrar la versión de escritorio (ventanas flotantes) o la de móvil
// (pestañas).

const BACKGROUND_LABELS = {
    rain: 'bgRain',
    parallax: 'bgParallax',
    matrix: 'bgMatrix',
    lensflare: 'bgLensflare',
    cube: 'bgCube',
    smoke: 'bgSmoke',
};

const DashboardPage = () => {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const { theme, cycleTheme, backgroundEffect, cycleBackground } = useTheme();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const typedText = useTypewriter(t('dashboard.title'), 100);
    const { stats, mapData, chatAnalytics, jobData, loading, error, warnings } = useDashboardData();

    // Functions for the buttons
    const handleLogout = useCallback(() => {
        logout();
        navigate('/login');
    }, [logout, navigate]);

    const handleGoHome = useCallback(() => {
        navigate('/');
    }, [navigate]);

    // Mientras llegan los datos del servidor, se muestra esta pantalla de carga.
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
                <div
                    className="dashboard-data-loading"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <span
                        className="app-loading-spinner app-loading-spinner-large"
                        aria-hidden="true"
                    />
                    <p>{t('dashboard.fetchingData')}</p>
                </div>
            </>
        );
    }

    // Si algo falla al cargar los datos, se muestra este aviso de error
    // con consejos de a qué puede deberse y un botón para reintentar.
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

    // En móvil se usa el diseño de pestañas en vez de ventanas flotantes.
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
    // En escritorio, cada sección del panel es una ventana flotante que se
    // puede mover, redimensionar y minimizar.
    // Desktop: floating windows dashboard
    return (
        <>
            <BackgroundEffect />

            <div className="dashboard-header">
                <h1 className="main-title">
                    <span className="typewriter-container">{typedText}</span>
                    <span className="terminal-cursor"></span>
                </h1>

                {/* DT-187: las fuentes que no han respondido se MUESTRAN. El hook
                    ya las anotaba y nadie las leía, así que una fuente caída era
                    indistinguible de una fuente sin ofertas. */}
                {warnings.length > 0 && (
                    <div
                        className="dashboard-warnings"
                        role="status"
                        title={warnings.join(', ')}
                        style={{ color: theme.warning }}
                    >
                        {t('dashboard.sourcesUnavailable', { count: warnings.length })}
                    </div>
                )}

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
                        {t('dashboard.theme')}
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
                        {t(`dashboard.${bgKey}`)}
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
