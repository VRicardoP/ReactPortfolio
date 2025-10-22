import RainEffect from './components/Background/RainEffect';
import FloatingWindow from './components/Windows/FloatingWindow';
import { WindowProvider } from './context/WindowContext';
import useTypewriter from './hooks/useTypewriter';
import './styles/base.css';

function App() {
  const typedText = useTypewriter('Vicente R. Pau > Portfolio', 100);

  return (
    <WindowProvider>
      <RainEffect />

      <h1 className="main-title">
        <span className="typewriter-container">{typedText}</span>
        <span className="terminal-cursor"></span>
      </h1>

      {/* Ventana de prueba */}
      <FloatingWindow
        id="test-window"
        title="Test Window"
        initialPosition={{ x: 150, y: 150 }}
        initialSize={{ width: 400, height: 300 }}
      >
        <h2>¡Funciona!</h2>
        <p>Esta es una ventana flotante de prueba.</p>
        <p>Puedes:</p>
        <ul>
          <li>Arrastrarla desde el header</li>
          <li>Redimensionarla desde los bordes y esquinas</li>
          <li>Minimizarla (botón morado)</li>
          <li>Maximizarla (botón amarillo)</li>
        </ul>
      </FloatingWindow>
    </WindowProvider>
  );
}

export default App;