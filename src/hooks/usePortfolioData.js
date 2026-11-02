// Trae los datos del portfolio (currículum, experiencia, habilidades...) en
// el idioma actual. Pide la API del servidor y el fichero estático de
// respaldo EN PARALELO: gana la que responda primero con datos válidos. El
// fichero estático lo sirve la misma CDN que ya entregó la página, así que
// en la práctica acota la espera a lo que tarde esa CDN — si la API responde
// antes (está rápida), se usa su contenido, que puede ser más reciente.
//
// Antes se pedía la API y solo SI FALLABA se caía al estático — pero un
// servidor que responde LENTO (no caído) no entra en ese "si falla", así que
// toda visita se quedaba esperando al servidor igual, con las ventanas del
// portfolio público sin aparecer mientras tanto.

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

    // Pide la API y el fichero estático en paralelo; la primera que traiga
    // datos válidos gana y la otra se descarta (se aborta su petición, para
    // no seguir gastando ancho de banda ni carga en un servidor ya lento).
    const loadData = async () => {
      setLoading(true);
      // El error es del intento ANTERIOR: `App.jsx` pinta su pantalla antes de
      // mirar `data`, asi que arrastrarlo dejaba el portfolio publico en error
      // aunque el idioma nuevo cargara bien.
      setError(null);
      const lang = (i18n.language || 'en').split('-')[0];

      let settled = false;
      const apiController = new AbortController();
      const staticController = new AbortController();

      // La gana quien llegue primero con datos válidos; aborta a la otra.
      const applyIfFirst = (result) => {
        if (cancelled || settled) return;
        settled = true;
        apiController.abort();
        staticController.abort();
        setData(result);
        setLoading(false);
      };

      const fromApi = (async () => {
        try {
          const apiResponse = await fetch(`${PORTFOLIO_API_URL}?lang=${lang}`, {
            headers: DEFAULT_HEADERS,
            signal: apiController.signal,
          });
          if (cancelled || settled || !apiResponse.ok) return;
          const apiData = await apiResponse.json();
          if (apiData && Object.keys(apiData).length > 0) applyIfFirst(apiData);
        } catch {
          // Lenta, caída o abortada por haber perdido la carrera: gana la otra.
        }
      })();

      const fromStatic = (async () => {
        try {
          const suffix = lang === 'en' ? '' : `-${lang}`;
          const cacheBust = `?v=${__APP_VERSION__ || '1'}`; // eslint-disable-line no-undef
          const response = await fetch(`/portfolio-data${suffix}.json${cacheBust}`, {
            signal: staticController.signal,
          });
          if (cancelled || settled) return;
          if (response.ok) {
            applyIfFirst(await response.json());
            return;
          }
          if (!suffix) return; // sin traducción de respaldo que probar
          const fallback = await fetch(`/portfolio-data.json${cacheBust}`, {
            signal: staticController.signal,
          });
          if (cancelled || settled || !fallback.ok) return;
          applyIfFirst(await fallback.json());
        } catch {
          // Igual: si la API tampoco trae nada, el error final lo pone abajo.
        }
      })();

      await Promise.all([fromApi, fromStatic]);
      if (!cancelled && !settled) {
        setError('Failed to load portfolio data');
        setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [i18n.language]);

  return { data, loading, error };
};

export default usePortfolioData;
