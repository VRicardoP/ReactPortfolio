// Trae todos los datos que necesita el panel de administración: las
// estadísticas de visitantes, el mapa, las del chat, y las ofertas de todas
// las fuentes de empleo a la vez (si alguna falla, no bloquea a las demás).
//
// DT-210: las 20 fuentes se piden en UNA sola llamada a
// `/api/v1/dashboard/job-sources`, que sirve una copia que el worker
// refresca por su cuenta cada 10 minutos. Antes el navegador disparaba 20
// peticiones en paralelo contra el núcleo central en cada carga del panel —
// cada una por separado tarda unos segundos, pero las 20 juntas desbordaban
// el tiempo que el backend espera a que el núcleo responda, y la mitad o más
// acababan en "unavailable" aunque el núcleo funcionara bien.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  CORE_SOURCE_BY_KEY,
  JOB_SOURCES,
  extractJobs,
  normalizeCoreJob,
  normalizeJob,
} from '../config/jobSources';
import { STATS_WINDOW_DAYS } from '../components/Dashboard/dashboardConstants';
import useAuthenticatedQuery from './useAuthenticatedQuery';

const SSE_REFETCH_DEBOUNCE_MS = 3000;

// DT-187: las fuentes "esenciales" son las que pide `fetchCritical`. Al
// recargarlas se reemplazan SOLO sus avisos; los de las fuentes de empleo, que
// anota el bucle de fondo, se conservan.
const CRITICAL_KEYS = ['stats', 'map', 'chat-analytics'];

export const useDashboardData = () => {
  const { authenticatedFetch } = useAuth();
  const { refetch: refetchStats } = useAuthenticatedQuery(
    `/api/v1/analytics/stats?days=${STATS_WINDOW_DAYS}`,
    { enabled: false },
  );
  const { refetch: refetchMap } = useAuthenticatedQuery(
    `/api/v1/analytics/map-data`,
    { enabled: false },
  );
  const { refetch: refetchChatAnalytics } = useAuthenticatedQuery(
    `/api/v1/analytics/chat/full-stats`,
    { enabled: false },
  );
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
    // DT-95: el reset de `error` se hace siempre, incluso en silent.
    setError(null);
    if (!silent) setLoading(true);

    const [statsData, mapDataPoints, chatAnalyticsJson] = await Promise.all([
      refetchStats(),
      refetchMap(),
      refetchChatAnalytics(),
    ]);
    const failedSources = [];
    if (statsData === null) failedSources.push('stats');
    if (mapDataPoints === null) failedSources.push('map');
    if (chatAnalyticsJson === null) failedSources.push('chat-analytics');

    setStats(statsData);
    setMapData(mapDataPoints ?? []);
    setChatAnalytics(chatAnalyticsJson ?? {
      general: null,
      top_questions: [],
      timeline_daily: [],
      by_country: [],
    });
    // Conserva los avisos de las fuentes de empleo durante un refetch crítico.
    setWarnings(prev => [
      ...prev.filter(k => !CRITICAL_KEYS.includes(k)),
      ...failedSources,
    ]);
    if (failedSources.includes('stats')) {
      setError('Failed to load dashboard data');
    }
    if (!silent) setLoading(false);
  }, [refetchChatAnalytics, refetchMap, refetchStats]);

  // Al abrir el panel, pide primero lo importante, y luego las ofertas de
  // todas las fuentes de empleo EN UNA SOLA LLAMADA (DT-210): la responde una
  // copia que el worker ya tiene preparada, nunca 20 peticiones en vivo.
  useEffect(() => {
    let aborted = false;

    const run = async () => {
      await fetchCritical();
      if (aborted) return;

      try {
        const res = await authenticatedFetch('/api/v1/dashboard/job-sources');
        if (!res.ok) throw new Error(`job-sources returned ${res.status}`);
        const { sources, warnings: sourceWarnings } = await res.json();
        if (aborted) return;

        const nextJobData = {};
        JOB_SOURCES.forEach(({ key }) => {
          const data = sources[key];
          if (!data) return;
          const coreSource = CORE_SOURCE_BY_KEY[key];
          const raw = extractJobs(data);
          const _normalized = raw.reduce((acc, job) => {
            try {
              acc.push(coreSource ? normalizeCoreJob(job, key) : normalizeJob(job, key));
            } catch (e) {
              if (import.meta.env.DEV) console.warn(`[useDashboardData] Failed to normalize job from ${key}:`, job, e);
            }
            return acc;
          }, []);
          nextJobData[key] = { ...data, _normalized };
        });
        setJobData(nextJobData);
        setWarnings(prev => [...prev, ...sourceWarnings]);
      } catch {
        if (!aborted) setWarnings(prev => [...prev, ...JOB_SOURCES.map(s => s.key)]);
      }
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
