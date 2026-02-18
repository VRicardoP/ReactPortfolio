import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import '../../styles/terminal.css';

const ASCII_BANNER = [
  ' _    ___                  __       ',
  '| |  / (_)_______  ____  / /____   ',
  '| | / / / ___/ _ \\/ __ \\/ __/ _ \\  ',
  '| |/ / / /__/  __/ / / / /_/  __/  ',
  '|___/_/\\___/\\___/_/ /_/\\__/\\___/   ',
  '',
];

const FAKE_FILES = {
  'about.txt': 'about',
  'skills.dat': 'skills',
  'experience.log': 'experience',
  'education.md': 'education',
  'contact.cfg': 'contact',
  'README.md': 'readme',
};

const TerminalWindow = memo(({ portfolioData, initialPosition, onClose }) => {
  const { t } = useTranslation();
  const [lines, setLines] = useState([]);
  const [history, setHistory] = useState([]);
  const historyIndexRef = useRef(-1);
  const [inputValue, setInputValue] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  const name = portfolioData?.name || 'Vicente';

  // Scroll to bottom when lines change
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Show welcome banner on mount
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

  const addLines = useCallback((newLines) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const executeCommand = useCallback((input) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Add command echo
    addLines([{ text: `visitor@portfolio:~$ ${trimmed}`, type: 'command' }]);

    const [cmd, ...args] = trimmed.split(/\s+/);
    const command = cmd.toLowerCase();

    switch (command) {
      case 'help': {
        addLines([
          { text: t('terminal.helpHeader'), type: 'highlight' },
          { text: '', type: 'info' },
          { text: '  help           ' + t('terminal.cmdHelp'), type: 'success' },
          { text: '  about          ' + t('terminal.cmdAbout'), type: 'success' },
          { text: '  skills         ' + t('terminal.cmdSkills'), type: 'success' },
          { text: '  experience     ' + t('terminal.cmdExperience'), type: 'success' },
          { text: '  education      ' + t('terminal.cmdEducation'), type: 'success' },
          { text: '  ls             ' + t('terminal.cmdLs'), type: 'success' },
          { text: '  cat <file>     ' + t('terminal.cmdCat'), type: 'success' },
          { text: '  whoami         ' + t('terminal.cmdWhoami'), type: 'success' },
          { text: '  ping           ' + t('terminal.cmdPing'), type: 'success' },
          { text: '  sudo hire_me   ' + t('terminal.cmdHireMe'), type: 'success' },
          { text: '  history        ' + t('terminal.cmdHistory'), type: 'success' },
          { text: '  exit           ' + t('terminal.cmdExit'), type: 'success' },
          { text: '  clear          ' + t('terminal.cmdClear'), type: 'success' },
          { text: '', type: 'info' },
        ]);
        break;
      }

      case 'about': {
        addLines([
          { text: `> ${name}`, type: 'highlight' },
          { text: `  ${portfolioData?.title || 'Full Stack Developer'}`, type: 'success' },
          { text: `  ${portfolioData?.location || ''}`, type: 'info' },
          { text: '', type: 'info' },
          { text: portfolioData?.profile?.description || '', type: 'success' },
          { text: '', type: 'info' },
        ]);
        break;
      }

      case 'skills': {
        const skills = portfolioData?.techSkills;
        if (!skills) {
          addLines([{ text: t('terminal.noData'), type: 'error' }]);
          break;
        }
        const sections = ['frontend', 'backend', 'databases', 'others'];
        const output = [];
        for (const section of sections) {
          if (skills[section]?.length) {
            output.push({ text: `\n  [${section.toUpperCase()}]`, type: 'highlight' });
            for (const skill of skills[section]) {
              const bar = '\u2588'.repeat(Math.round(skill.level / 5));
              const empty = '\u2591'.repeat(20 - Math.round(skill.level / 5));
              output.push({
                text: `  ${skill.name.padEnd(30)} ${bar}${empty} ${skill.level}%`,
                type: 'success',
              });
            }
          }
        }
        output.push({ text: '', type: 'info' });
        addLines(output);
        break;
      }

      case 'experience': {
        const exp = portfolioData?.experience;
        if (!exp?.length) {
          addLines([{ text: t('terminal.noData'), type: 'error' }]);
          break;
        }
        const output = [{ text: `\n  ${t('terminal.experienceHeader')}`, type: 'highlight' }, { text: '', type: 'info' }];
        for (const job of exp) {
          output.push({ text: `  > ${job.title}`, type: 'highlight' });
          output.push({ text: `    ${job.company} | ${job.location} | ${job.date}`, type: 'info' });
          output.push({ text: `    ${job.description}`, type: 'success' });
          output.push({ text: '', type: 'info' });
        }
        addLines(output);
        break;
      }

      case 'education': {
        const edu = portfolioData?.education;
        if (!edu?.length) {
          addLines([{ text: t('terminal.noData'), type: 'error' }]);
          break;
        }
        const output = [{ text: `\n  ${t('terminal.educationHeader')}`, type: 'highlight' }, { text: '', type: 'info' }];
        for (const item of edu) {
          const inst = item.institution ? ` @ ${item.institution}` : '';
          const date = item.date ? ` (${item.date})` : '';
          output.push({ text: `  > ${item.title}${inst}${date}`, type: 'success' });
          if (item.description) {
            output.push({ text: `    ${item.description}`, type: 'info' });
          }
        }
        output.push({ text: '', type: 'info' });
        addLines(output);
        break;
      }

      case 'ls': {
        const output = [{ text: '', type: 'info' }];
        for (const [filename] of Object.entries(FAKE_FILES)) {
          output.push({ text: `  -rw-r--r--  1 visitor  staff   ${filename}`, type: 'success' });
        }
        output.push({ text: '', type: 'info' });
        addLines(output);
        break;
      }

      case 'cat': {
        const filename = args[0];
        if (!filename) {
          addLines([{ text: 'cat: ' + t('terminal.missingFilename'), type: 'error' }]);
          break;
        }
        const mapped = FAKE_FILES[filename];
        if (!mapped) {
          addLines([{ text: `cat: ${filename}: ${t('terminal.fileNotFound')}`, type: 'error' }]);
          break;
        }
        // Re-execute the mapped command
        executeCommand(mapped);
        return; // Don't add to history twice
      }

      case 'whoami': {
        addLines([
          { text: '', type: 'info' },
          { text: `  ${t('terminal.whoamiUser')}`, type: 'success' },
          { text: `  ${t('terminal.whoamiRole')}`, type: 'info' },
          { text: `  ${t('terminal.whoamiAccess')}`, type: 'info' },
          { text: '', type: 'info' },
        ]);
        break;
      }

      case 'ping': {
        addLines([
          { text: `PING ${name.toLowerCase().replace(/\s+/g, '.')}.dev (127.0.0.1): 56 data bytes`, type: 'info' },
          { text: `64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.042ms`, type: 'success' },
          { text: `64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.038ms`, type: 'success' },
          { text: `64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.041ms`, type: 'success' },
          { text: '', type: 'info' },
          { text: `--- ${t('terminal.pingResult')} ---`, type: 'highlight' },
          { text: t('terminal.pingStats'), type: 'success' },
          { text: '', type: 'info' },
        ]);
        break;
      }

      case 'sudo': {
        if (args.join('_').toLowerCase() === 'hire_me') {
          addLines([
            { text: '', type: 'info' },
            { text: '  ' + t('terminal.hireMe1'), type: 'highlight' },
            { text: '  ' + t('terminal.hireMe2'), type: 'success' },
            { text: `  ${t('terminal.hireMe3')} ${portfolioData?.email || 'vicente.pau@hotmail.com'}`, type: 'success' },
            { text: '  ' + t('terminal.hireMe4'), type: 'highlight' },
            { text: '', type: 'info' },
          ]);
        } else {
          addLines([{ text: `sudo: ${args.join(' ')}: command not found`, type: 'error' }]);
        }
        break;
      }

      case 'history': {
        if (history.length === 0) {
          addLines([{ text: t('terminal.noHistory'), type: 'info' }]);
        } else {
          const output = history.map((cmd, i) => ({
            text: `  ${String(i + 1).padStart(4)}  ${cmd}`,
            type: 'info',
          }));
          addLines(output);
        }
        break;
      }

      case 'exit': {
        addLines([{ text: t('terminal.exiting'), type: 'info' }]);
        setTimeout(() => onClose?.(), 300);
        return;
      }

      case 'clear': {
        setLines([]);
        return; // Don't add the echo line
      }

      default: {
        addLines([
          { text: `${command}: ${t('terminal.commandNotFound')}`, type: 'error' },
          { text: t('terminal.tryHelp'), type: 'info' },
        ]);
      }
    }
  }, [addLines, portfolioData, name, history, t, onClose]);

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

  // Focus input when clicking terminal body
  const handleBodyClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <FloatingWindow
      id="terminal-window"
      title={t('terminal.title')}
      initialPosition={initialPosition}
      initialSize={{ width: 600, height: 400 }}
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
          />
        </form>
      </div>
    </FloatingWindow>
  );
});

TerminalWindow.displayName = 'TerminalWindow';

export default TerminalWindow;
