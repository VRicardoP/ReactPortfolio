// El Terminal (easter egg) es como una consola de ordenador falsa: aquí
// están todas las órdenes que entiende (help, about, skills, ls, cat...),
// cada una como una función que recibe lo que escribió el usuario y
// devuelve las líneas de texto que hay que mostrar.
/**
 * Terminal command registry.
 *
 * Each entry maps a command name to a handler: (args, ctx) => lines[] | null.
 *   - args: the raw argument string after the command name
 *   - ctx:  shared context object with portfolioData, t, i18n, theme helpers,
 *           addLines, setLines, setShowBanner, history, executeCommand, onClose
 *
 * Returning an array of { text, type } lines causes them to be appended.
 * Returning null means the handler managed output itself (e.g. clear, cat).
 */

import { BACKGROUND_EFFECTS } from './backgrounds';

const FAKE_FILES = {
  'about.txt': 'about',
  'skills.dat': 'skills',
  'experience.log': 'experience',
  'education.md': 'education',
  'contact.cfg': 'contact',
  'README.md': 'readme',
};

const SKILL_SECTIONS = ['frontend', 'backend', 'databases', 'others'];
const SKILL_BAR_LENGTH = 20;
const SKILL_LEVEL_DIVISOR = 5;
const SKILL_NAME_PAD = 30;

// --- Individual command handlers ---

// Muestra la lista de órdenes disponibles con una breve descripción de cada una.
function helpCommand(_args, { t }) {
  return [
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
    { text: '  background     ' + t('terminal.cmdBackground'), type: 'success' },
    { text: '  theme          ' + t('terminal.cmdTheme'), type: 'success' },
    { text: '  lang           ' + t('terminal.cmdLang'), type: 'success' },
    { text: '  sudo hire_me   ' + t('terminal.cmdHireMe'), type: 'success' },
    { text: '  history        ' + t('terminal.cmdHistory'), type: 'success' },
    { text: '  exit           ' + t('terminal.cmdExit'), type: 'success' },
    { text: '  clear          ' + t('terminal.cmdClear'), type: 'success' },
    { text: '', type: 'info' },
  ];
}

// Muestra un breve resumen de quién es el dueño del portfolio.
function aboutCommand(_args, { portfolioData, name }) {
  return [
    { text: `> ${name}`, type: 'highlight' },
    { text: `  ${portfolioData?.title || 'Full Stack Developer'}`, type: 'success' },
    { text: `  ${portfolioData?.location || ''}`, type: 'info' },
    { text: '', type: 'info' },
    { text: portfolioData?.profile?.description || '', type: 'success' },
    { text: '', type: 'info' },
  ];
}

// Dibuja las habilidades técnicas como barras de progreso de texto (#...).
function skillsCommand(_args, { portfolioData, t }) {
  const skills = portfolioData?.techSkills;
  if (!skills) {
    return [{ text: t('terminal.noData'), type: 'error' }];
  }
  const output = [];
  for (const section of SKILL_SECTIONS) {
    if (skills[section]?.length) {
      output.push({ text: `\n  [${section.toUpperCase()}]`, type: 'highlight' });
      for (const skill of skills[section]) {
        const filled = Math.round(skill.level / SKILL_LEVEL_DIVISOR);
        const bar = '#'.repeat(filled);
        const empty = '.'.repeat(SKILL_BAR_LENGTH - filled);
        output.push({
          text: `  ${skill.name.padEnd(SKILL_NAME_PAD)} ${bar}${empty} ${skill.level}%`,
          type: 'success',
        });
      }
    }
  }
  output.push({ text: '', type: 'info' });
  return output;
}

// Lista la experiencia laboral (puesto, empresa, fechas y descripción).
function experienceCommand(_args, { portfolioData, t }) {
  const exp = portfolioData?.experience;
  if (!exp?.length) {
    return [{ text: t('terminal.noData'), type: 'error' }];
  }
  const output = [
    { text: `\n  ${t('terminal.experienceHeader')}`, type: 'highlight' },
    { text: '', type: 'info' },
  ];
  for (const job of exp) {
    output.push({ text: `  > ${job.title}`, type: 'highlight' });
    output.push({ text: `    ${job.company} | ${job.location} | ${job.date}`, type: 'info' });
    output.push({ text: `    ${job.description}`, type: 'success' });
    output.push({ text: '', type: 'info' });
  }
  return output;
}

// Lista los estudios (título, centro y fechas).
function educationCommand(_args, { portfolioData, t }) {
  const edu = portfolioData?.education;
  if (!edu?.length) {
    return [{ text: t('terminal.noData'), type: 'error' }];
  }
  const output = [
    { text: `\n  ${t('terminal.educationHeader')}`, type: 'highlight' },
    { text: '', type: 'info' },
  ];
  for (const item of edu) {
    const inst = item.institution ? ` @ ${item.institution}` : '';
    const date = item.date ? ` (${item.date})` : '';
    output.push({ text: `  > ${item.title}${inst}${date}`, type: 'success' });
    if (item.description) {
      output.push({ text: `    ${item.description}`, type: 'info' });
    }
  }
  output.push({ text: '', type: 'info' });
  return output;
}

// Lista los "ficheros" falsos que se pueden abrir con el comando cat.
function lsCommand() {
  const output = [{ text: '', type: 'info' }];
  for (const filename of Object.keys(FAKE_FILES)) {
    output.push({ text: `  -rw-r--r--  1 visitor  staff   ${filename}`, type: 'success' });
  }
  output.push({ text: '', type: 'info' });
  return output;
}

// "Abre" uno de los ficheros falsos, ejecutando el comando real al que
// equivale (p.ej. "about.txt" ejecuta el comando "about").
function catCommand(args, { t, addLines, executeCommand }) {
  const filename = args[0];
  if (!filename) {
    addLines([{ text: 'cat: ' + t('terminal.missingFilename'), type: 'error' }]);
    return null;
  }
  const mapped = FAKE_FILES[filename];
  if (mapped && mapped !== 'cat' && !mapped.startsWith('cat ')) {
    executeCommand(mapped);
  } else {
    addLines([{ text: `cat: ${filename}: ${t('terminal.fileNotFound')}`, type: 'error' }]);
  }
  return null;
}

// Dice quién es el usuario "conectado" a esta consola falsa (de broma).
function whoamiCommand(_args, { t }) {
  return [
    { text: '', type: 'info' },
    { text: `  ${t('terminal.whoamiUser')}`, type: 'success' },
    { text: `  ${t('terminal.whoamiRole')}`, type: 'info' },
    { text: `  ${t('terminal.whoamiAccess')}`, type: 'info' },
    { text: '', type: 'info' },
  ];
}

// Simula el comando "ping" de la vida real, con resultados inventados.
function pingCommand(_args, { name, t }) {
  return [
    { text: `PING ${name.toLowerCase().replace(/\s+/g, '.')}.dev (127.0.0.1): 56 data bytes`, type: 'info' },
    { text: '64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.042ms', type: 'success' },
    { text: '64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.038ms', type: 'success' },
    { text: '64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.041ms', type: 'success' },
    { text: '', type: 'info' },
    { text: `--- ${t('terminal.pingResult')} ---`, type: 'highlight' },
    { text: t('terminal.pingStats'), type: 'success' },
    { text: '', type: 'info' },
  ];
}

// Si se escribe "sudo hire_me" muestra un mensaje invitando a contactar;
// cualquier otro uso de "sudo" da un error como en una consola real.
function sudoCommand(args, { portfolioData, t }) {
  if (args.join('_').toLowerCase() === 'hire_me') {
    return [
      { text: '', type: 'info' },
      { text: '  ' + t('terminal.hireMe1'), type: 'highlight' },
      { text: '  ' + t('terminal.hireMe2'), type: 'success' },
      { text: `  ${t('terminal.hireMe3')} ${portfolioData?.email || 'vicente.pau@hotmail.com'}`, type: 'success' },
      { text: '  ' + t('terminal.hireMe4'), type: 'highlight' },
      { text: '', type: 'info' },
    ];
  }
  return [{ text: `sudo: ${args.join(' ')}: command not found`, type: 'error' }];
}

// Permite ver o cambiar el efecto de fondo animado escribiendo su nombre.
function backgroundCommand(args, { backgroundEffect, setBackground, t }) {
  const sub = args[0]?.toLowerCase();
  if (!sub) {
    return [
      { text: `  ${t('terminal.backgroundCurrent', { effect: backgroundEffect })}`, type: 'info' },
      { text: `  ${t('terminal.backgroundUsage')}`, type: 'info' },
      { text: '', type: 'info' },
    ];
  }
  if (sub === 'list') {
    return [
      { text: `  ${t('terminal.backgroundCurrent', { effect: backgroundEffect })}`, type: 'info' },
      { text: `  ${t('terminal.backgroundAvailable')}`, type: 'highlight' },
      ...BACKGROUND_EFFECTS.map(e => ({
        text: `    ${e === backgroundEffect ? '> ' : '  '}${e}${e === backgroundEffect ? ' (active)' : ''}`,
        type: e === backgroundEffect ? 'highlight' : 'success',
      })),
      { text: '', type: 'info' },
    ];
  }
  if (BACKGROUND_EFFECTS.includes(sub)) {
    setBackground(sub);
    return [
      { text: `  ${t('terminal.backgroundChanged', { effect: sub })}`, type: 'success' },
      { text: '', type: 'info' },
    ];
  }
  return [{ text: `  ${t('terminal.backgroundInvalid', { effect: sub })}`, type: 'error' }];
}

// Permite ver o cambiar el tema de color de la web escribiendo su nombre.
function themeCommand(args, { themeName, availableThemes, setTheme, t }) {
  const sub = args[0]?.toLowerCase();
  if (!sub) {
    return [
      { text: `  ${t('terminal.themeCurrent', { theme: themeName })}`, type: 'info' },
      { text: `  ${t('terminal.themeUsage')}`, type: 'info' },
      { text: '', type: 'info' },
    ];
  }
  if (sub === 'list') {
    return [
      { text: `  ${t('terminal.themeCurrent', { theme: themeName })}`, type: 'info' },
      { text: `  ${t('terminal.themeAvailable')}`, type: 'highlight' },
      ...availableThemes.map(({ key, name: label }) => ({
        text: `    ${key === themeName ? '> ' : '  '}${key} (${label})${key === themeName ? ' (active)' : ''}`,
        type: key === themeName ? 'highlight' : 'success',
      })),
      { text: '', type: 'info' },
    ];
  }
  if (availableThemes.some(({ key }) => key === sub)) {
    setTheme(sub);
    return [
      { text: `  ${t('terminal.themeChanged', { theme: sub })}`, type: 'success' },
      { text: '', type: 'info' },
    ];
  }
  return [{ text: `  ${t('terminal.themeInvalid', { theme: sub })}`, type: 'error' }];
}

// Permite ver o cambiar el idioma de la web escribiendo su código.
function langCommand(args, { i18n, t }) {
  const sub = args[0]?.toLowerCase();
  const currentLang = (i18n.language || 'en').split('-')[0];
  const supportedLanguages = i18n.options.supportedLngs.filter(lng => lng !== 'cimode');
  if (!sub) {
    return [
      { text: `  ${t('terminal.langCurrent', { lang: currentLang })}`, type: 'info' },
      { text: `  ${t('terminal.langUsage')}`, type: 'info' },
      { text: '', type: 'info' },
    ];
  }
  if (sub === 'list') {
    return [
      { text: `  ${t('terminal.langCurrent', { lang: currentLang })}`, type: 'info' },
      { text: `  ${t('terminal.langAvailable')}`, type: 'highlight' },
      ...supportedLanguages.map(l => ({
        text: `    ${l === currentLang ? '> ' : '  '}${l}${l === currentLang ? ' (active)' : ''}`,
        type: l === currentLang ? 'highlight' : 'success',
      })),
      { text: '', type: 'info' },
    ];
  }
  if (supportedLanguages.includes(sub)) {
    i18n.changeLanguage(sub);
    return [
      { text: `  ${t('terminal.langChanged', { lang: sub })}`, type: 'success' },
      { text: '', type: 'info' },
    ];
  }
  return [{ text: `  ${t('terminal.langInvalid', { lang: sub })}`, type: 'error' }];
}

// Muestra las órdenes escritas antes, numeradas.
function historyCommand(_args, { history, t }) {
  if (history.length === 0) {
    return [{ text: t('terminal.noHistory'), type: 'info' }];
  }
  return history.map((cmd, i) => ({
    text: `  ${String(i + 1).padStart(4)}  ${cmd}`,
    type: 'info',
  }));
}

const EXIT_DELAY_MS = 300;

// Cierra la ventana del Terminal tras una breve pausa.
function exitCommand(_args, { t, onClose }) {
  setTimeout(() => onClose?.(), EXIT_DELAY_MS);
  return [{ text: t('terminal.exiting'), type: 'info' }];
}

// Muestra un pequeño texto de presentación sobre este portfolio.
function readmeCommand() {
  return [
    { text: '# README.md', type: 'highlight' },
    { text: '', type: 'info' },
    { text: 'Interactive Portfolio - Vicente Pau', type: 'success' },
    { text: 'Built with React + FastAPI + Three.js', type: 'success' },
    { text: '', type: 'info' },
    { text: 'This portfolio was built to be explored.', type: 'info' },
    { text: 'Not all secrets are visible from the GUI.', type: 'info' },
    { text: '', type: 'info' },
    { text: '> Hint: Try typing "help" for available commands.', type: 'highlight' },
  ];
}

// Borra toda la pantalla del Terminal.
function clearCommand(_args, { setLines }) {
  setLines([]);
  return null;
}

// --- Registry: maps command names to handlers ---
// Aliases (bg, language) point to the same handler as the primary command.

// Diccionario que relaciona lo que escribe el usuario con la función que
// debe ejecutarse ("bg" y "language" son alias de "background" y "lang").
const commandRegistry = {
  help: helpCommand,
  about: aboutCommand,
  skills: skillsCommand,
  experience: experienceCommand,
  education: educationCommand,
  ls: lsCommand,
  cat: catCommand,
  whoami: whoamiCommand,
  ping: pingCommand,
  sudo: sudoCommand,
  background: backgroundCommand,
  bg: backgroundCommand,
  theme: themeCommand,
  lang: langCommand,
  language: langCommand,
  history: historyCommand,
  exit: exitCommand,
  readme: readmeCommand,
  clear: clearCommand,
};

// Dibujo del nombre "Vicente" hecho con caracteres de texto, que se
// muestra al abrir el Terminal.
export const ASCII_BANNER = [
  ' _    ___                  __       ',
  '| |  / (_)_______  ____  / /____   ',
  '| | / / / ___/ _ \\/ __ \\/ __/ _ \\  ',
  '| |/ / / /__/  __/ / / / /_/  __/  ',
  '|___/_/\\___/\\___/_/ /_/\\__/\\___/   ',
  '',
];

export default commandRegistry;
