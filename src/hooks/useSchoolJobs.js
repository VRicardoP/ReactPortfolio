import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { ADMIN_BACKEND_URL } from '../config/api';
import useAuthenticatedQuery from './useAuthenticatedQuery';

const SCHOOLS_URL = `${ADMIN_BACKEND_URL}/api/v1/schools/`;
const SCHOOL_JOBS_URL = `${ADMIN_BACKEND_URL}/api/v1/schools/jobs/all`;
const SCHOOL_JOB_ACTIONS_URL = `${ADMIN_BACKEND_URL}/api/v1/schools/jobs`;
const REFRESH_URL = `${ADMIN_BACKEND_URL}/api/v1/schools/refresh`;

// Espera tras POST /refresh antes de re-pollear (el scraper corre en background)
const SCRAPE_POLL_DELAY_MS = 8000;

/**
 * Fetches schools metadata + detected school jobs.
 * Returns: { schools, jobs, loading, error, refresh, refreshing, triggerScrape }
 */
// Trae del servidor la lista de colegios vigilados y las ofertas detectadas
// en ellos, y permite forzar una revisión manual o descartar una oferta.
const useSchoolJobs = () => {
  const { authenticatedFetch, isAuthenticated } = useAuth();
  const {
    data: schoolsData,
    loading: schoolsLoading,
    error: schoolsError,
    refetch: refetchSchools,
  } = useAuthenticatedQuery(SCHOOLS_URL, { enabled: isAuthenticated });
  const {
    data: jobsData,
    loading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useAuthenticatedQuery(SCHOOL_JOBS_URL, { enabled: isAuthenticated });
  const [actionError, setActionError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissError, setDismissError] = useState(null);
  const [dismissingJobIds, setDismissingJobIds] = useState(() => new Set());
  const [dismissedJobIds, setDismissedJobIds] = useState(() => new Set());

  const schools = Array.isArray(schoolsData) ? schoolsData : [];
  const jobs = (Array.isArray(jobsData) ? jobsData : [])
    .filter((job) => !dismissedJobIds.has(job.id));
  const loading = isAuthenticated && (schoolsLoading || jobsLoading);
  const error = actionError || schoolsError?.message || jobsError?.message || null;

  // DT-93: timers + mounted flag para evitar setState tras unmount
  const scrapePollTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (scrapePollTimerRef.current) {
        clearTimeout(scrapePollTimerRef.current);
        scrapePollTimerRef.current = null;
      }
    };
  }, []);

  // Vuelve a pedir la lista de colegios y sus ofertas detectadas.
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    if (mountedRef.current) {
      setActionError(null);
      setDismissError(null);
    }
    await Promise.all([refetchSchools(), refetchJobs()]);
  }, [isAuthenticated, refetchJobs, refetchSchools]);

  // Pide al servidor que revise ahora mismo todos los colegios, y vuelve a
  // consultar los resultados pasado un tiempo (la revisión tarda en segundo plano).
  const triggerScrape = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      await authenticatedFetch(REFRESH_URL, { method: 'POST' });
      // Limpia un timer previo si triggerScrape se invoca varias veces
      if (scrapePollTimerRef.current) {
        clearTimeout(scrapePollTimerRef.current);
      }
      scrapePollTimerRef.current = setTimeout(() => {
        scrapePollTimerRef.current = null;
        if (!mountedRef.current) return;
        refresh().finally(() => {
          if (mountedRef.current) setRefreshing(false);
        });
      }, SCRAPE_POLL_DELAY_MS);
    } catch (err) {
      if (mountedRef.current) {
        setActionError(err.message || 'Failed to trigger scrape');
        setRefreshing(false);
      }
    }
  }, [authenticatedFetch, isAuthenticated, refresh]);

  // Oculta una oferta de colegio concreta (sin borrar el dato original).
  const dismissJob = useCallback(async (jobId) => {
    if (!isAuthenticated || dismissingJobIds.has(jobId)) return;
    setDismissError(null);
    setDismissingJobIds((current) => new Set(current).add(jobId));
    try {
      // DT-141: la ruta anterior insertaba /all antes del UUID y no existia.
      // await authenticatedFetch(`${SCHOOL_JOBS_URL}/${jobId}/dismiss`, { method: 'POST' });
      await authenticatedFetch(`${SCHOOL_JOB_ACTIONS_URL}/${jobId}/dismiss`, { method: 'POST' });
      if (mountedRef.current) {
        setDismissedJobIds((current) => new Set(current).add(jobId));
      }
    } catch (err) {
      if (mountedRef.current) setDismissError(err.message || 'Failed to dismiss school job');
    } finally {
      if (mountedRef.current) {
        setDismissingJobIds((current) => {
          const next = new Set(current);
          next.delete(jobId);
          return next;
        });
      }
    }
  }, [authenticatedFetch, dismissingJobIds, isAuthenticated]);

  // DT-141: firma anterior, sustituida por la variante que expone el descarte persistente.
  // return { schools, jobs, loading, error, refresh, refreshing, triggerScrape };
  return {
    schools,
    jobs,
    loading,
    error,
    dismissError,
    refresh,
    refreshing,
    triggerScrape,
    dismissJob,
    dismissingJobIds,
  };
};

export default useSchoolJobs;
