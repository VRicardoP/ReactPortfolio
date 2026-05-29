import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

const SCHOOLS_URL = `${BACKEND_URL}/api/v1/schools/`;
const SCHOOL_JOBS_URL = `${BACKEND_URL}/api/v1/schools/jobs/all`;
const REFRESH_URL = `${BACKEND_URL}/api/v1/schools/refresh`;

/**
 * Fetches schools metadata + detected school jobs.
 * Returns: { schools, jobs, loading, error, refresh, triggerScrape }
 *
 * - `schools`: full list incl. scrape/manual_only modes
 * - `jobs`: SchoolJob rows ordered by date_detected desc
 * - `refresh()`: re-fetch both
 * - `triggerScrape()`: POST /refresh and re-fetch after a delay
 */
const useSchoolJobs = () => {
  const { authenticatedFetch, isAuthenticated } = useAuth();
  const [schools, setSchools] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [schoolsRes, jobsRes] = await Promise.all([
        authenticatedFetch(SCHOOLS_URL),
        authenticatedFetch(SCHOOL_JOBS_URL),
      ]);
      const [schoolsJson, jobsJson] = await Promise.all([
        schoolsRes.json(),
        jobsRes.json(),
      ]);
      setSchools(Array.isArray(schoolsJson) ? schoolsJson : []);
      setJobs(Array.isArray(jobsJson) ? jobsJson : []);
    } catch (err) {
      setError(err.message || 'Failed to load school data');
    } finally {
      setLoading(false);
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
      // Server runs in background; wait a bit before polling.
      setTimeout(() => {
        refresh().finally(() => setRefreshing(false));
      }, 8000);
    } catch (err) {
      setError(err.message || 'Failed to trigger scrape');
      setRefreshing(false);
    }
  }, [authenticatedFetch, isAuthenticated, refresh]);

  return { schools, jobs, loading, error, refresh, refreshing, triggerScrape };
};

export default useSchoolJobs;
