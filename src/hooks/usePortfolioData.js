import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL, DEFAULT_HEADERS } from '../config/api';

const PORTFOLIO_API_URL = `${BACKEND_URL}/api/v1/cv-profiles/portfolio-data`;

const usePortfolioData = () => {
  const { i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // El conmutador de idioma (LanguageSwitcher) es de un clic: dos cambios
    // seguidos dejan dos cargas en vuelo, cada una con hasta tres `await`
    // encadenados (API -> fichero estatico -> respaldo en ingles). La carga
    // abandonada no puede publicar su idioma: esto es el portfolio PUBLICO, y
    // el usuario se quedaria leyendo todo el contenido en un idioma que ya no
    // es el que muestra el conmutador.
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      // El error es del intento ANTERIOR: `App.jsx` pinta su pantalla antes de
      // mirar `data`, asi que arrastrarlo dejaba el portfolio publico en error
      // aunque el idioma nuevo cargara bien.
      setError(null);
      const lang = (i18n.language || 'en').split('-')[0];

      try {
        // Try API first (serves from database)
        const apiResponse = await fetch(`${PORTFOLIO_API_URL}?lang=${lang}`, { headers: DEFAULT_HEADERS });
        if (cancelled) return;
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          if (cancelled) return;
          if (apiData && Object.keys(apiData).length > 0) {
            setData(apiData);
            setLoading(false);
            return;
          }
        }
      } catch {
        // API unavailable — fall through to static file
      }
      if (cancelled) return;

      // Fallback to static JSON files
      try {
        const suffix = lang === 'en' ? '' : `-${lang}`;
        const cacheBust = `?v=${__APP_VERSION__ || '1'}`; // eslint-disable-line no-undef
        const response = await fetch(`/portfolio-data${suffix}.json${cacheBust}`);
        if (cancelled) return;
        if (!response.ok) {
          if (suffix) {
            const fallback = await fetch(`/portfolio-data.json${cacheBust}`);
            if (cancelled) return;
            if (!fallback.ok) throw new Error('Failed to load portfolio data');
            const fallbackData = await fallback.json();
            if (cancelled) return;
            setData(fallbackData);
            return;
          }
          throw new Error('Failed to load portfolio data');
        }
        const staticData = await response.json();
        if (cancelled) return;
        setData(staticData);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [i18n.language]);

  return { data, loading, error };
};

export default usePortfolioData;
