import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL } from '../config/api';

const PORTFOLIO_API_URL = `${BACKEND_URL}/api/v1/cv-profiles/portfolio-data`;

const usePortfolioData = () => {
  const { i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const lang = (i18n.language || 'en').split('-')[0];

      try {
        // Try API first (serves from database)
        const apiResponse = await fetch(`${PORTFOLIO_API_URL}?lang=${lang}`);
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          if (apiData && Object.keys(apiData).length > 0) {
            setData(apiData);
            setLoading(false);
            return;
          }
        }
      } catch {
        // API unavailable — fall through to static file
      }

      // Fallback to static JSON files
      try {
        const suffix = lang === 'en' ? '' : `-${lang}`;
        const cacheBust = `?v=${__APP_VERSION__ || '1'}`; // eslint-disable-line no-undef
        const response = await fetch(`/portfolio-data${suffix}.json${cacheBust}`);
        if (!response.ok) {
          if (suffix) {
            const fallback = await fetch(`/portfolio-data.json${cacheBust}`);
            if (!fallback.ok) throw new Error('Failed to load portfolio data');
            setData(await fallback.json());
            return;
          }
          throw new Error('Failed to load portfolio data');
        }
        setData(await response.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [i18n.language]);

  return { data, loading, error };
};

export default usePortfolioData;
