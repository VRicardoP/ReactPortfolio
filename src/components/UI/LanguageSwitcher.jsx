import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/language-switcher.css';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'ja', label: 'JA', name: '日本語' },
  { code: 'it', label: 'IT', name: 'Italiano' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = (i18n.language || 'en').split('-')[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = useCallback((code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  }, [i18n]);

  return (
    <div className="language-switcher" ref={ref}>
      <button
        className="language-switcher-btn"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Select language"
        aria-expanded={open}
      >
        {currentLang.toUpperCase()}
      </button>
      {open && (
        <div className="language-switcher-dropdown" role="listbox" aria-label="Languages">
          {LANGUAGES.map(({ code, label, name }) => (
            <button
              key={code}
              className={`language-option${code === currentLang ? ' active' : ''}`}
              onClick={() => handleChange(code)}
              role="option"
              aria-selected={code === currentLang}
            >
              <span className="language-option-code">{label}</span>
              <span className="language-option-name">{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
