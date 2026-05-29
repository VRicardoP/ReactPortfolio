import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

const SCHOOLS_URL = `${BACKEND_URL}/api/v1/schools/`;
const SCHOOL_JOBS_URL = `${BACKEND_URL}/api/v1/schools/jobs/all`;
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

  return { schools, jobs, loading, error, refresh, refreshing, triggerScrape };
};

export default useSchoolJobs;
