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
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    let aborted = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const failedSources = [];

        // load everything at once so it's faster
        const promises = [
          // visit statistics
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/stats?days=30`)
            .then(res => res.json())
            .catch(() => { failedSources.push('stats'); return null; }),

          // data points for the visitors map
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/map-data`)
            .then(res => res.json())
            .catch(() => { failedSources.push('map'); return []; }),

          // chatbot statistics
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/chat/full-stats`)
            .then(res => {
              if (!res.ok) {
                return { general: null, top_questions: [], timeline_daily: [], by_country: [] };
              }
              return res.json();
            })
            .catch(() => { failedSources.push('chat-analytics'); return { general: null, top_questions: [], timeline_daily: [], by_country: [] }; }),

          // recent jobs from jobicy for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/jobicy-jobs/recent-jobs`)
            .then(res => res.json())
            .catch(() => { failedSources.push('jobicy'); return null; }),

          // recent jobs from remotive for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/remotive-jobs/recent`)
            .then(res => res.json())
            .catch(() => { failedSources.push('remotive'); return null; }),

          // recent jobs from arbeitnow for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/arbeitnow-jobs/recent`)
            .then(res => res.json())
            .catch(() => { failedSources.push('arbeitnow'); return null; }),

          // recent jobs from jsearch for the job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/jsearch-jobs/recent`)
            .then(res => res.json())
            .catch(() => { failedSources.push('jsearch'); return null; })
        ];

        const [statsData, mapDataPoints, chatAnalyticsJson, recentJobsJson, remotiveRecentJson, arbeitnowRecentJson, jsearchRecentJson] = await Promise.all(promises);

        if (!aborted) {
          setStats(statsData);
          setMapData(mapDataPoints);
          setChatAnalytics(chatAnalyticsJson);
          setRecentJobs(recentJobsJson);
          setRemotiveRecentJobs(remotiveRecentJson);
          setArbeitnowRecentJobs(arbeitnowRecentJson);
          setJsearchRecentJobs(jsearchRecentJson);
          setWarnings(failedSources);
          setLoading(false);
        }
      } catch (err) {
        if (!aborted) {
          setError(err.message || 'Failed to load dashboard data');
          setLoading(false);
        }
      }
    };

    loadData();

    return () => { aborted = true; };
  }, [authenticatedFetch]);

  return { stats, mapData, chatAnalytics, recentJobs, remotiveRecentJobs, arbeitnowRecentJobs, jsearchRecentJobs, loading, error, warnings };
};
