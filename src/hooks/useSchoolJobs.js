import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

const SCHOOLS_URL = `${BACKEND_URL}/api/v1/schools/`;
const SCHOOL_JOBS_URL = `${BACKEND_URL}/api/v1/schools/jobs/all`;
const SCHOOL_JOB_ACTIONS_URL = `${BACKEND_URL}/api/v1/schools/jobs`;
const REFRESH_URL = `${BACKEND_URL}/api/v1/schools/refresh`;

// Espera tras POST /refresh antes de re-pollear (el scraper corre en background)
const SCRAPE_POLL_DELAY_MS = 8000;

/**
 * Fetches schools metadata + detected school jobs.
 * Returns: { schools, jobs, loading, error, refresh, refreshing, triggerScrape }
 */
const useSchoolJobs = () => {
  const { authenticatedFetch, isAuthenticated } = useAuth();
  const [schools, setSchools] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissError, setDismissError] = useState(null);
  const [dismissingJobIds, setDismissingJobIds] = useState(() => new Set());

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

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      if (mountedRef.current) setLoading(false);
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setDismissError(null);
    }
    try {
      const [schoolsRes, jobsRes] = await Promise.all([
        authenticatedFetch(SCHOOLS_URL),
        authenticatedFetch(SCHOOL_JOBS_URL),
      ]);
      const [schoolsJson, jobsJson] = await Promise.all([
        schoolsRes.json(),
        jobsRes.json(),
      ]);
      if (!mountedRef.current) return;
      setSchools(Array.isArray(schoolsJson) ? schoolsJson : []);
      setJobs(Array.isArray(jobsJson) ? jobsJson : []);
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'Failed to load school data');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [authenticatedFetch, isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
        setError(err.message || 'Failed to trigger scrape');
        setRefreshing(false);
      }
    }
  }, [authenticatedFetch, isAuthenticated, refresh]);

  const dismissJob = useCallback(async (jobId) => {
    if (!isAuthenticated || dismissingJobIds.has(jobId)) return;
    setDismissError(null);
    setDismissingJobIds((current) => new Set(current).add(jobId));
    try {
      // DT-141: la ruta anterior insertaba /all antes del UUID y no existia.
      // await authenticatedFetch(`${SCHOOL_JOBS_URL}/${jobId}/dismiss`, { method: 'POST' });
      await authenticatedFetch(`${SCHOOL_JOB_ACTIONS_URL}/${jobId}/dismiss`, { method: 'POST' });
      if (mountedRef.current) {
        setJobs((current) => current.filter((job) => job.id !== jobId));
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
