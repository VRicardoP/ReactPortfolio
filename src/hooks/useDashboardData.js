import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

export const useDashboardData = () => {
  const { authenticatedFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [chatAnalytics, setChatAnalytics] = useState(null);
  const [recentJobs, setRecentJobs] = useState(null);
  const [remotiveRecentJobs, setRemotiveRecentJobs] = useState(null);
  const [arbeitnowRecentJobs, setArbeitnowRecentJobs] = useState(null);
  const [jsearchRecentJobs, setJsearchRecentJobs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // load everything at once so it's faster
        const promises = [
          // visit statistics
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/stats?days=30`)
            .then(res => res.json())
            .catch(() => null),

          // data points for the visitors map
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/map-data`)
            .then(res => res.json())
            .catch(() => []),

          // chatbot statistics
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/chat/full-stats`)
            .then(res => {
              if (!res.ok) {
                return { general: null, top_questions: [], timeline_daily: [], by_country: [] };
              }
              return res.json();
            })
            .catch(() => ({ general: null, top_questions: [], timeline_daily: [], by_country: [] })),

          // recent jobs from jobicy for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/jobicy-jobs/recent-jobs`)
            .then(res => res.json())
            .catch(() => null),

          // recent jobs from remotive for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/remotive-jobs/recent`)
            .then(res => res.json())
            .catch(() => null),

          // recent jobs from arbeitnow for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/arbeitnow-jobs/recent`)
            .then(res => res.json())
            .catch(() => null),

          // recent jobs from jsearch for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/jsearch-jobs/recent`)
            .then(res => res.json())
            .catch(() => null)
        ];

        const [statsData, mapDataPoints, chatAnalyticsJson, recentJobsJson, remotiveRecentJson, arbeitnowRecentJson, jsearchRecentJson] = await Promise.all(promises);

        setStats(statsData);
        setMapData(mapDataPoints);
        setChatAnalytics(chatAnalyticsJson);
        setRecentJobs(recentJobsJson);
        setRemotiveRecentJobs(remotiveRecentJson);
        setArbeitnowRecentJobs(arbeitnowRecentJson);
        setJsearchRecentJobs(jsearchRecentJson);

        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadData();
  }, [authenticatedFetch]);

  return { stats, mapData, chatAnalytics, recentJobs, remotiveRecentJobs, arbeitnowRecentJobs, jsearchRecentJobs, loading, error };
};