import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const usePortfolioData = () => {
  const { i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const lang = (i18n.language || 'en').split('-')[0];
      const suffix = lang === 'en' ? '' : `-${lang}`;

      try {
        const response = await fetch(`/portfolio-data${suffix}.json`);
        if (!response.ok) {
          // Fallback to English if translated file is missing (skip if already English)
          if (suffix) {
            const fallback = await fetch('/portfolio-data.json');
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
