import { lazy, Suspense, memo } from 'react';
import RainEffect from './components/Background/RainEffect';
import Toast from './components/UI/Toast';
import { WindowProvider } from './context/WindowContext';
import useTypewriter from './hooks/useTypewriter';
import usePortfolioData from './hooks/usePortfolioData';
import useWindowLayout from './hooks/useWindowLayout';
import './styles/base.css';
import './styles/windows-content.css';

// Lazy loading de todos los componentes de ventanas
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

// Loading component optimizado
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

// Componente interno que usa el WindowContext - MEMOIZADO
const PortfolioContent = memo(({ portfolioData }) => {
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

  return (
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
  );
});

PortfolioContent.displayName = 'PortfolioContent';

function App() {
  const { data: portfolioData, loading, error } = usePortfolioData();
  const typedText = useTypewriter(
    portfolioData ? `${portfolioData.name} > Portfolio` : 'Loading...',
    100
  );

  // Estado de carga
  if (loading) {
    return (
      <>
        <RainEffect />
        <h1 className="main-title">
          <span className="typewriter-container">Loading portfolio...</span>
          <span className="terminal-cursor"></span>
        </h1>
      </>
    );
  }

  // Estado de error
  if (error) {
    return (
      <>
        <RainEffect />
        <h1 className="main-title">
          <span className="typewriter-container">Error loading data</span>
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
          <p>Failed to load portfolio data.</p>
          <p>Please check that portfolio-data.json exists in the public folder.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <RainEffect />

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