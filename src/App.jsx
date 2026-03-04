import { lazy, Suspense, memo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import BackgroundEffect from './components/Background/BackgroundEffect';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/UI/Toast';
import { WindowProvider } from './context/WindowContext';
import useTypewriter from './hooks/useTypewriter';
import usePortfolioData from './hooks/usePortfolioData';
import useWindowLayout from './hooks/useWindowLayout';
import useVisitorTracking from './hooks/useVisitorTracking';
import useInteractionTracking from './hooks/useInteractionTracking';
import useIsMobile from './hooks/useIsMobile';
import MobileNav from './components/UI/MobileNav';
import MobileChatSheet from './components/UI/MobileChatSheet';
import './styles/base.css';
import './styles/windows-content.css';
import './styles/mobile.css';

// lazy load windows only when needed so the page loads faster
const WelcomeWindow = lazy(() => import('./components/Windows/WelcomeWindow'));
const ProfileWindow = lazy(() => import('./components/Windows/ProfileWindow'));
const ContactWindow = lazy(() => import('./components/Windows/ContactWindow'));
const LanguagesWindow = lazy(() => import('./components/Windows/LanguagesWindow'));
const SoftSkillsWindow = lazy(() => import('./components/Windows/SoftSkillsWindow'));
const TechSkillsWindow = lazy(() => import('./components/Windows/TechSkillsWindow'));
const EducationWindow = lazy(() => import('./components/Windows/EducationWindow'));
const PortfolioWindow = lazy(() => import('./components/Windows/PortfolioWindow'));
const ExperienceWindow = lazy(() => import('./components/Windows/ExperienceWindow'));
const AchievementsWindow = lazy(() => import('./components/Windows/AchievementsWindow'));
const ChatWindow = lazy(() => import('./components/Windows/ChatWindow'));
const TerminalWindow = lazy(() => import('./components/Windows/TerminalWindow'));
const FitMatrixWindow = lazy(() => import('./components/Windows/FitMatrixWindow'));

// this is what is shown while a window is loading
const WindowLoader = memo(() => (
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
        ⏳
      </div>
      Loading...
    </div>
  </div>
));

WindowLoader.displayName = 'WindowLoader';

// Desktop: floating windows with drag/resize/minimize
const DesktopPortfolioContent = memo(({ portfolioData }) => {
  const [showTerminal, setShowTerminal] = useState(false);

  const portfolioWindowIds = [
    'profile-window',
    'soft-skills-window',
    'education-window',
    'experience-window',
    'languages-window',
    'tech-skills-window',
    'portfolio-window',
    'achievements-window',
    'contact-window',
    'chat-window',
    'fit-matrix-window'
  ];

  useWindowLayout(portfolioWindowIds, 500);

  // Ctrl+` or Ctrl+ñ toggles the terminal easter egg
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && (e.key === 'ñ' || e.key === '`')) {
      e.preventDefault();
      setShowTerminal(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
    <Suspense fallback={<WindowLoader />}>
      <WelcomeWindow portfolioData={portfolioData} />

      <ProfileWindow
        data={portfolioData}
        initialPosition={{ x: 100, y: 120 }}
      />

      <SoftSkillsWindow
        data={portfolioData}
        initialPosition={{ x: 150, y: 140 }}
      />

      <EducationWindow
        data={portfolioData}
        initialPosition={{ x: 200, y: 160 }}
      />

      <ExperienceWindow
        data={portfolioData}
        initialPosition={{ x: 250, y: 180 }}
      />

      <LanguagesWindow
        data={portfolioData}
        initialPosition={{ x: 300, y: 200 }}
      />

      <TechSkillsWindow
        data={portfolioData}
        initialPosition={{ x: 350, y: 220 }}
      />

      <PortfolioWindow
        data={portfolioData}
        initialPosition={{ x: 400, y: 240 }}
      />

      <AchievementsWindow
        data={portfolioData}
        initialPosition={{ x: 450, y: 260 }}
      />

      <ContactWindow
        data={portfolioData}
        initialPosition={{ x: 500, y: 280 }}
      />

      <ChatWindow
        data={portfolioData}
        initialPosition={{ x: 550, y: 300 }}
      />

      <FitMatrixWindow
        data={portfolioData}
        initialPosition={{ x: 600, y: 320 }}
      />
    </Suspense>

    {showTerminal && (
      <Suspense fallback={<WindowLoader />}>
        <TerminalWindow
          portfolioData={portfolioData}
          initialPosition={{ x: 150, y: 150 }}
          onClose={() => setShowTerminal(false)}
        />
      </Suspense>
    )}
    </>
  );
});

DesktopPortfolioContent.displayName = 'DesktopPortfolioContent';

// Mobile: scrollable sections with collapsible cards
const MobilePortfolioLayout = memo(({ portfolioData }) => {
  const { t } = useTranslation();
  const [showTerminal, setShowTerminal] = useState(false);

  const handleTerminalToggle = useCallback(() => {
    setShowTerminal(prev => !prev);
  }, []);

  return (
    <>
      <MobileNav
        title={portfolioData?.name || 'Portfolio'}
        onTerminalToggle={handleTerminalToggle}
      />

      <div className="mobile-portfolio-container">
        <header className="mobile-hero">
          <h1 className="mobile-hero-name">{portfolioData?.name}</h1>
          <p className="mobile-hero-title">{portfolioData?.title}</p>
          <p className="mobile-hero-intro">{t('welcome.intro')}</p>
        </header>

        <Suspense fallback={<WindowLoader />}>
          <ProfileWindow data={portfolioData} defaultExpanded />
          <ExperienceWindow data={portfolioData} defaultExpanded />
          <TechSkillsWindow data={portfolioData} />
          <EducationWindow data={portfolioData} />
          <PortfolioWindow data={portfolioData} />
          <SoftSkillsWindow data={portfolioData} />
          <LanguagesWindow data={portfolioData} />
          <AchievementsWindow data={portfolioData} />
          <FitMatrixWindow data={portfolioData} />
          <ContactWindow data={portfolioData} defaultExpanded />
        </Suspense>
      </div>

      <MobileChatSheet data={portfolioData} />
      <Toast />

      {showTerminal && (
        <Suspense fallback={<WindowLoader />}>
          <div className="mobile-terminal-sheet">
            <div className="mobile-terminal-header">
              <span className="mobile-terminal-header-title">Terminal</span>
              <button
                className="mobile-chat-close-btn"
                onClick={() => setShowTerminal(false)}
                aria-label="Close terminal"
              >
                {'\u00D7'}
              </button>
            </div>
            <div className="mobile-terminal-body">
              <TerminalWindow
                portfolioData={portfolioData}
                onClose={() => setShowTerminal(false)}
              />
            </div>
          </div>
        </Suspense>
      )}
    </>
  );
});

MobilePortfolioLayout.displayName = 'MobilePortfolioLayout';

function App() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();

  // track the user's visit
  useVisitorTracking();
  useInteractionTracking();

  // Sync html lang attribute with current i18n language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // subtle console hint about the terminal easter egg
  useEffect(() => {
    if (import.meta.env.DEV) console.log('%c>_ Terminal access available. Try Ctrl+` or Ctrl+ñ', 'color: #00ffff; font-family: monospace; font-size: 12px;');
  }, []);

  const { data: portfolioData, loading, error } = usePortfolioData();
  const typedText = useTypewriter(
    portfolioData ? `${portfolioData.name} > Portfolio` : t('app.loading'),
    100
  );

  // while loading data show a message
  if (loading) {
    return (
      <>
        <ErrorBoundary fallback={null}><BackgroundEffect /></ErrorBoundary>
        <h1 className="main-title">
          <span className="typewriter-container">{t('app.loadingPortfolio')}</span>
          <span className="terminal-cursor"></span>
        </h1>
      </>
    );
  }

  // if something goes wrong show the error
  if (error) {
    return (
      <>
        <ErrorBoundary fallback={null}><BackgroundEffect /></ErrorBoundary>
        <h1 className="main-title">
          <span className="typewriter-container">{t('app.errorLoadingData')}</span>
          <span className="terminal-cursor"></span>
        </h1>
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ff6b6b',
          fontFamily: 'Courier New',
          fontSize: '16px',
          textAlign: 'center',
          zIndex: 1000,
          padding: '20px',
          maxWidth: '90%'
        }}>
          <p>{t('app.failedToLoad')}</p>
          <p>{t('app.checkJson')}</p>
        </div>
      </>
    );
  }

  // Mobile layout: scrollable sections, no floating windows
  if (isMobile) {
    return <MobilePortfolioLayout portfolioData={portfolioData} />;
  }

  // Desktop layout: floating windows with drag/resize
  return (
    <main>
      <BackgroundEffect />

      <h1 className="main-title">
        <span className="typewriter-container">{typedText}</span>
        <span className="terminal-cursor" aria-hidden="true"></span>
      </h1>

      <Toast />

      <WindowProvider>
        <DesktopPortfolioContent portfolioData={portfolioData} />
      </WindowProvider>
    </main>
  );
}

export default App;
