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
  const [remoteokRecentJobs, setRemoteokRecentJobs] = useState(null);
  const [himalayasRecentJobs, setHimalayasRecentJobs] = useState(null);
  const [adzunaRecentJobs, setAdzunaRecentJobs] = useState(null);
  const [weworkremotelyRecentJobs, setWeworkremotelyRecentJobs] = useState(null);
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

        // Job data — loads in background, windows update progressively
        const jobFetches = [
          { setter: setRecentJobs, url: `${BACKEND_URL}/api/v1/jobicy-jobs/recent-jobs`, name: 'jobicy' },
          { setter: setRemotiveRecentJobs, url: `${BACKEND_URL}/api/v1/remotive-jobs/recent`, name: 'remotive' },
          { setter: setArbeitnowRecentJobs, url: `${BACKEND_URL}/api/v1/arbeitnow-jobs/recent`, name: 'arbeitnow' },
          { setter: setJsearchRecentJobs, url: `${BACKEND_URL}/api/v1/jsearch-jobs/recent`, name: 'jsearch' },
          { setter: setRemoteokRecentJobs, url: `${BACKEND_URL}/api/v1/remoteok-jobs/recent`, name: 'remoteok' },
          { setter: setHimalayasRecentJobs, url: `${BACKEND_URL}/api/v1/himalayas-jobs/recent`, name: 'himalayas' },
          { setter: setAdzunaRecentJobs, url: `${BACKEND_URL}/api/v1/adzuna-jobs/recent`, name: 'adzuna' },
          { setter: setWeworkremotelyRecentJobs, url: `${BACKEND_URL}/api/v1/weworkremotely-jobs/recent`, name: 'weworkremotely' },
        ];

        // Fire all job fetches in parallel, each updates state independently
        jobFetches.forEach(({ setter, url, name }) => {
          authenticatedFetch(url)
            .then(res => res.json())
            .then(data => { if (!aborted) setter(data); })
            .catch(() => { if (!aborted) failedSources.push(name); });
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

  return { stats, mapData, chatAnalytics, recentJobs, remotiveRecentJobs, arbeitnowRecentJobs, jsearchRecentJobs, remoteokRecentJobs, himalayasRecentJobs, adzunaRecentJobs, weworkremotelyRecentJobs, loading, error, warnings };
};
