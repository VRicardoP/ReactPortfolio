import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { JOB_SOURCES, extractJobs, normalizeJob } from '../config/jobSources';

export const useDashboardData = () => {
  const { authenticatedFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [chatAnalytics, setChatAnalytics] = useState(null);
  const [jobData, setJobData] = useState({});
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

        // Critical data — dashboard waits only for these 3
        const criticalPromises = [
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/stats?days=30`)
            .then(res => res.json())
            .catch(() => { failedSources.push('stats'); return null; }),

          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/map-data`)
            .then(res => res.json())
            .catch(() => { failedSources.push('map'); return []; }),

          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/chat/full-stats`)
            .then(res => {
              if (!res.ok) {
                return { general: null, top_questions: [], timeline_daily: [], by_country: [] };
              }
              return res.json();
            })
            .catch(() => { failedSources.push('chat-analytics'); return { general: null, top_questions: [], timeline_daily: [], by_country: [] }; }),
        ];

        const [statsData, mapDataPoints, chatAnalyticsJson] = await Promise.all(criticalPromises);

        if (!aborted) {
          setStats(statsData);
          setMapData(mapDataPoints);
          setChatAnalytics(chatAnalyticsJson);
          setWarnings(failedSources);
          setLoading(false);
        }

        // Job data — loads in background, normalize at fetch time so render is cheap
        JOB_SOURCES.forEach(({ key, urlPath }) => {
          authenticatedFetch(`${BACKEND_URL}${urlPath}`)
            .then(res => res.json())
            .then(data => {
              if (!aborted) {
                const raw = extractJobs(data);
                const _normalized = raw.map(j => normalizeJob(j, key));
                setJobData(prev => ({ ...prev, [key]: { ...data, _normalized } }));
              }
            })
            .catch(() => { if (!aborted) failedSources.push(key); });
        });

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

  return { stats, mapData, chatAnalytics, jobData, loading, error, warnings };
};
