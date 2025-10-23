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
import { WindowProvider } from './context/WindowContext';
import useTypewriter from './hooks/useTypewriter';
import usePortfolioData from './hooks/usePortfolioData';
import './styles/base.css';
import './styles/windows-content.css';

function App() {
  const { data: portfolioData, loading, error } = usePortfolioData();
  const typedText = useTypewriter(
    portfolioData ? `${portfolioData.name} > Portfolio` : 'Loading...',
    100
  );

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

  if (error) {
    return (
      <>
        <RainEffect />
        <h1 className="main-title">
          <span className="typewriter-container">Error loading data</span>
          <span className="terminal-cursor"></span>
        </h1>
      </>
    );
  }

  return (
    <WindowProvider>
      <RainEffect />

      <h1 className="main-title">
        <span className="typewriter-container">{typedText}</span>
        <span className="terminal-cursor"></span>
      </h1>

      {/* Ventana de Bienvenida */}
      <WelcomeWindow portfolioData={portfolioData} />

      {/* Ventanas del Portfolio */}
      <ProfileWindow data={portfolioData} initialPosition={{ x: 100, y: 120 }} />
      <SoftSkillsWindow data={portfolioData} initialPosition={{ x: 150, y: 140 }} />
      <EducationWindow data={portfolioData} initialPosition={{ x: 200, y: 160 }} />
      <ExperienceWindow data={portfolioData} initialPosition={{ x: 250, y: 180 }} />
      <LanguagesWindow data={portfolioData} initialPosition={{ x: 300, y: 200 }} />
      <TechSkillsWindow data={portfolioData} initialPosition={{ x: 350, y: 220 }} />
      <PortfolioWindow data={portfolioData} initialPosition={{ x: 400, y: 240 }} />
      <ContactWindow data={portfolioData} initialPosition={{ x: 450, y: 260 }} />
    </WindowProvider>
  );
}

export default App;