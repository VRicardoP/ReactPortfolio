import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import commandRegistry, { ASCII_BANNER } from '../config/terminalCommands';

/**
 * Hook that encapsulates terminal state management, command dispatch, and keyboard handling.
 * Command logic lives in config/terminalCommands.js (registry pattern).
 */
// Hace funcionar la "terminal" oculta del portfolio: guarda las líneas de
// texto que se ven, entiende los comandos que se escriben, y recuerda el
// historial para poder subir/bajar con las flechas del teclado.
export default function useTerminalCommands({ portfolioData, onClose }) {
  const { t, i18n } = useTranslation();
  const { backgroundEffect, setBackground, setTheme, themeName, availableThemes } = useTheme();

  const [lines, setLines] = useState([]);
  const [history, setHistory] = useState([]);
  const historyIndexRef = useRef(-1);
  const [inputValue, setInputValue] = useState('');
  const [showBanner, setShowBanner] = useState(true);

  const name = portfolioData?.name || 'Vicente';

  // Show welcome banner on mount
  // Al abrir la terminal por primera vez, muestra el mensaje de bienvenida.
  useEffect(() => {
    if (showBanner) {
      const bannerLines = [
        ...ASCII_BANNER.map(l => ({ text: l, type: 'ascii' })),
        { text: t('terminal.welcome', { name }), type: 'success' },
        { text: t('terminal.hint'), type: 'info' },
        { text: '', type: 'info' },
      ];
      setLines(bannerLines);
      setShowBanner(false);
    }
  }, [showBanner, name, t]);

  // Añade nuevas líneas de texto a la pantalla de la terminal.
  const addLines = useCallback((newLines) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  // Interpreta el texto escrito por el visitante: busca el comando
  // correspondiente en el registro y ejecuta su acción.
  const executeCommand = useCallback((input) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addLines([{ text: `visitor@portfolio:~$ ${trimmed}`, type: 'command' }]);

    const [cmd, ...args] = trimmed.split(/\s+/);
    const command = cmd.toLowerCase();

    const handler = commandRegistry[command];
    if (!handler) {
      addLines([
        { text: `${command}: ${t('terminal.commandNotFound')}`, type: 'error' },
        { text: t('terminal.tryHelp'), type: 'info' },
      ]);
      return;
    }

    const ctx = {
      portfolioData,
      name,
      t,
      i18n,
      backgroundEffect,
      setBackground,
      setTheme,
      themeName,
      availableThemes,
      addLines,
      setLines,
      setShowBanner,
      history,
      executeCommand,
      onClose,
    };

    const result = handler(args, ctx);
    if (result !== null) {
      addLines(result);
    }
  }, [addLines, portfolioData, name, history, t, i18n, onClose, backgroundEffect, setBackground, themeName, setTheme, availableThemes]);

  // Se ejecuta al pulsar Enter: guarda el comando en el historial y lo ejecuta.
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      setHistory(prev => [...prev, trimmed]);
      historyIndexRef.current = -1;
      executeCommand(trimmed);
    }
    setInputValue('');
  }, [inputValue, executeCommand]);

  // Permite navegar por los comandos anteriores con las flechas arriba/abajo,
  // como en una terminal real.
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = historyIndexRef.current;
      const next = prev === -1 ? history.length - 1 : Math.max(0, prev - 1);
      if (next >= 0 && next < history.length) {
        setInputValue(history[next]);
        historyIndexRef.current = next;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIndexRef.current + 1;
      if (next >= history.length) {
        setInputValue('');
        historyIndexRef.current = -1;
      } else {
        setInputValue(history[next]);
        historyIndexRef.current = next;
      }
    }
  }, [history]);

  return { lines, inputValue, setInputValue, handleSubmit, handleKeyDown };
}
