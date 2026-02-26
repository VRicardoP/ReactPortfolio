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
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        <div className="terminal-output" ref={outputRef}>
          {lines.map((line, i) => (
            <div key={i} className={`terminal-line terminal-line--${line.type}`}>
              {line.text}
            </div>
          ))}
        </div>
        <form className="terminal-input-row" onSubmit={handleSubmit}>
          <span className="terminal-prompt">visitor@portfolio:~$</span>
          <input
            ref={inputRef}
            className="terminal-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
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
