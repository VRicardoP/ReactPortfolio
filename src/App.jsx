import RainEffect from './components/Background/RainEffect';
import WelcomeWindow from './components/Windows/WelcomeWindow';
import ProfileWindow from './components/Windows/ProfileWindow';
import ContactWindow from './components/Windows/ContactWindow';
import LanguagesWindow from './components/Windows/LanguagesWindow';
import SoftSkillsWindow from './components/Windows/SoftSkillsWindow';
import TechSkillsWindow from './components/Windows/TechSkillsWindow';
import EducationWindow from './components/Windows/EducationWindow';
import PortfolioWindow from './components/Windows/PortfolioWindow';
import ExperienceWindow from './components/Windows/ExperienceWindow';
import ChatWindow from './components/Windows/ChatWindow';
import Toast from './components/UI/Toast';
import { WindowProvider } from './context/WindowContext';
import useTypewriter from './hooks/useTypewriter';
import usePortfolioData from './hooks/usePortfolioData';
import useWindowLayout from './hooks/useWindowLayout';
import './styles/base.css';
import './styles/windows-content.css';

// Componente interno que usa el WindowContext
function PortfolioContent({ portfolioData }) {
  // IDs de las ventanas del portfolio (excluyendo welcome)
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

  // Hook para la animación cascada → menú (4 segundos después de cargar)
  useWindowLayout(portfolioWindowIds, 500);

  return (
    <>
      {/* Ventana de Bienvenida (permanece centrada, no se minimiza) */}
      <WelcomeWindow portfolioData={portfolioData} />

      {/* Ventanas del Portfolio (se minimizan automáticamente después de 4s) */}
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
    </>
  );
}

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
          zIndex: 1000
        }}>
          <p>Failed to load portfolio data.</p>
          <p>Please check that portfolio-data.json exists in the public folder.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Efecto de lluvia de fondo */}
      <RainEffect />

      {/* Título principal con efecto typewriter */}
      <h1 className="main-title">
        <span className="typewriter-container">{typedText}</span>
        <span className="terminal-cursor"></span>
      </h1>

      {/* Sistema de notificaciones Toast */}
      <Toast />

      {/* WindowProvider envuelve solo las ventanas */}
      <WindowProvider>
        <PortfolioContent portfolioData={portfolioData} />
      </WindowProvider>
    </>
  );
}

export default App;