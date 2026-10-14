// Ventana de la "terminal" escondida (easter egg): dibuja la pantalla de
// texto y la casilla donde escribir comandos; toda la lógica de los
// comandos vive en el hook useTerminalCommands.

import { memo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import useTerminalCommands from '../../hooks/useTerminalCommands';
import '../../styles/terminal.css';

const TerminalWindow = memo(({ portfolioData, initialPosition, onClose }) => {
  const { t } = useTranslation();
  const { lines, inputValue, setInputValue, handleSubmit, handleKeyDown } =
    useTerminalCommands({ portfolioData, onClose });

  const outputRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when lines change
  // Baja el scroll hasta el final cada vez que aparece una línea nueva.
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Auto-focus input on mount
  // Pone el cursor listo para escribir en cuanto se abre la terminal.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Si se hace clic en cualquier parte de la terminal, vuelve a poner el
  // foco en la casilla de escribir.
  const handleBodyClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <FloatingWindow
      id="terminal-window"
      title={t('terminal.title')}
      initialPosition={initialPosition}
      initialSize={{ width: 900, height: 600 }}
    >
      <div className="terminal-body" onClick={handleBodyClick}>
        <div className="terminal-output" ref={outputRef} role="log" aria-live="polite" aria-label="Terminal output">
          {lines.map((line, i) => (
            <div key={i} className={`terminal-line terminal-line--${line.type}`}>
              {line.text}
            </div>
          ))}
        </div>
        <form className="terminal-input-row" onSubmit={handleSubmit}>
          <span className="terminal-prompt" aria-hidden="true">visitor@portfolio:~$</span>
          <input
            ref={inputRef}
            className="terminal-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Terminal command input"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </form>
      </div>
    </FloatingWindow>
  );
});

TerminalWindow.displayName = 'TerminalWindow';

export default TerminalWindow;
