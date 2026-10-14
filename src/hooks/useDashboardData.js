// Trae todos los datos que necesita el panel de administración: las
// estadísticas de visitantes, el mapa, las del chat, y las ofertas de todas
// las fuentes de empleo a la vez (si alguna falla, no bloquea a las demás).

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import {
  CORE_SOURCE_BY_KEY,
  JOB_SOURCES,
  extractJobs,
  normalizeCoreJob,
  normalizeJob,
} from '../config/jobSources';

const SSE_REFETCH_DEBOUNCE_MS = 3000;

export const useDashboardData = () => {
  const { authenticatedFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [chatAnalytics, setChatAnalytics] = useState(null);
  const [jobData, setJobData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);

  // Pide los datos más importantes del panel (estadísticas, mapa, chat) a la
  // vez; si alguno falla, lo apunta como aviso pero sigue con los demás.
  const fetchCritical = useCallback(async ({ silent = false } = {}) => {
    // DT-95: el reset de `error` se hace siempre, incluso en silent. Antes solo
    // se reseteaba si !silent → un error previo se quedaba "pegado" cuando el
    // SSE disparaba un refetch exitoso.
    setError(null);
    if (!silent) setLoading(true);
    const failedSources = [];

    const promises = [
      authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/stats?days=30`)
        .then(res => res.json())
        .catch(() => { failedSources.push('stats'); return null; }),

      authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/map-data`)
        .then(res => res.json())
        .catch(() => { failedSources.push('map'); return []; }),

      authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/chat/full-stats`)
        .then(res => res.ok
          ? res.json()
          : { general: null, top_questions: [], timeline_daily: [], by_country: [] })
        .catch(() => {
          failedSources.push('chat-analytics');
          return { general: null, top_questions: [], timeline_daily: [], by_country: [] };
        }),
    ];

    try {
      const [statsData, mapDataPoints, chatAnalyticsJson] = await Promise.all(promises);
      setStats(statsData);
      setMapData(mapDataPoints);
      setChatAnalytics(chatAnalyticsJson);
      setWarnings(failedSources);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authenticatedFetch]);

  // Al abrir el panel, pide primero lo importante, y luego va pidiendo las
  // ofertas de cada fuente de empleo en segundo plano, una por una.
  useEffect(() => {
    let aborted = false;

    const run = async () => {
      await fetchCritical();
      if (aborted) return;

      // Job data — loads in background, normalize at fetch time so render is cheap
      JOB_SOURCES.forEach(({ key, urlPath }) => {
        const coreSource = CORE_SOURCE_BY_KEY[key];
        const path = coreSource
          ? `/api/v1/jobs/search?source=${encodeURIComponent(coreSource)}&limit=100&oneshot=true`
          : urlPath;
        authenticatedFetch(`${BACKEND_URL}${path}`)
          .then(res => {
            if (!res.ok) throw new Error(`Job source ${key} returned ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (aborted) return;
            const raw = extractJobs(data);
            const _normalized = raw.reduce((acc, job) => {
              try {
                acc.push(coreSource ? normalizeCoreJob(job, key) : normalizeJob(job, key));
              } catch (e) {
                if (import.meta.env.DEV) console.warn(`[useDashboardData] Failed to normalize job from ${key}:`, job, e);
              }
              return acc;
            }, []);
            setJobData(prev => ({ ...prev, [key]: { ...data, _normalized } }));
          })
          .catch(() => { if (!aborted) setWarnings(prev => [...prev, key]); });
      });
    };

    run();
    return () => { aborted = true; };
  }, [fetchCritical, authenticatedFetch]);

  // Refresh critical data when SSE signals new visitor/chat. Debounced so a burst
  // of events triggers a single refetch.
  // Cuando llega un aviso en tiempo real de visita o chat nuevo, vuelve a
  // pedir los datos importantes (esperando un poco para no repetirlo si
  // llegan varios avisos juntos).
  useEffect(() => {
    let timer;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchCritical({ silent: true }), SSE_REFETCH_DEBOUNCE_MS);
    };
    window.addEventListener('dashboard-data-stale', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('dashboard-data-stale', handler);
    };
  }, [fetchCritical]);

  return { stats, mapData, chatAnalytics, jobData, loading, error, warnings };
};
