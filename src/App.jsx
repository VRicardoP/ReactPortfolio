import RainEffect from './components/Background/RainEffect';
import FloatingWindow from './components/Windows/FloatingWindow';
import WelcomeWindow from './components/Windows/WelcomeWindow';
import { WindowProvider } from './context/WindowContext';
import useTypewriter from './hooks/useTypewriter';
import usePortfolioData from './hooks/usePortfolioData';
import './styles/base.css';

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

      {/* Ventana de prueba (la quitaremos en Fase 3) */}
      <FloatingWindow
        id="test-window"
        title="Test Window"
        initialPosition={{ x: 150, y: 150 }}
        initialSize={{ width: 400, height: 300 }}
      >
        <h2>Datos cargados desde JSON</h2>
        <p><strong>Nombre:</strong> {portfolioData.name}</p>
        <p><strong>Email:</strong> {portfolioData.email}</p>
        <p><strong>Ubicación:</strong> {portfolioData.location}</p>
        <p><strong>Experiencias:</strong> {portfolioData.experience.length}</p>
        <p><strong>Skills técnicas:</strong> {Object.keys(portfolioData.techSkills).length} categorías</p>
      </FloatingWindow>
    </WindowProvider>
  );
}

export default App;