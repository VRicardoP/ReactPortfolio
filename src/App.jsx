import RainEffect from './components/Background/RainEffect';
import useTypewriter from './hooks/useTypewriter';
import './styles/base.css';

function App() {
  const typedText = useTypewriter('Vicente R. Pau > Portfolio', 100);

  return (
    <>
      <RainEffect />

      <h1 className="main-title">
        <span className="typewriter-container">{typedText}</span>
        <span className="terminal-cursor"></span>
      </h1>
    </>
  );
}

export default App;