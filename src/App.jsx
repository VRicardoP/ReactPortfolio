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
import './styles/base.css';
import './styles/windows-content.css';

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
const ChatWindow = lazy(() => import('./components/Windows/ChatWindow'));
const TerminalWindow = lazy(() => import('./components/Windows/TerminalWindow'));

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

// this component contains all the portfolio windows
const PortfolioContent = memo(({ portfolioData }) => {
  const [showTerminal, setShowTerminal] = useState(false);

  const portfolioWindowIds = [
    'profile-window',
    'soft-skills-window',
    'education-window',
    'experience-window',
    'languages-window',
    'tech-skills-window',
    'portfolio-window',
    'contact-window',
    'chat-window'
  ];

  useWindowLayout(portfolioWindowIds, 500);

  // Ctrl+ñ toggles the terminal easter egg
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.key === 'ñ') {
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

      <ContactWindow
        data={portfolioData}
        initialPosition={{ x: 450, y: 260 }}
      />

      <ChatWindow
        data={portfolioData}
        initialPosition={{ x: 500, y: 280 }}
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

PortfolioContent.displayName = 'PortfolioContent';

function App() {
  const { t } = useTranslation();

  // track the user's visit
  useVisitorTracking();

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

  return (
    <>
      <BackgroundEffect />

      <h1 className="main-title">
        <span className="typewriter-container">{typedText}</span>
        <span className="terminal-cursor"></span>
      </h1>

      <Toast />

      <WindowProvider>
        <PortfolioContent portfolioData={portfolioData} />
      </WindowProvider>
    </>
  );
}

export default App;