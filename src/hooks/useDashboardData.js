import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';

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

        // cargo todo a la vez para que vaya mas rapido
        const promises = [
          // las estadisticas de visitas
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/stats?days=30`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading stats:', err);
              return null;
            }),

          // los puntos para el mapa de visitantes
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/map-data`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading map data:', err);
              return [];
            }),

          // estadisticas del chatbot
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/chat/full-stats`)
            .then(res => {
              if (!res.ok) {
                console.warn('Chat analytics not available (status:', res.status, ')');
                return { general: null, top_questions: [], timeline_daily: [], by_country: [] };
              }
              return res.json();
            })
            .catch(err => {
              console.warn('Chat analytics endpoint not ready:', err.message);
              return { general: null, top_questions: [], timeline_daily: [], by_country: [] };
            }),

          // trabajos recientes de jobicy para el job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/jobicy-jobs/recent-jobs`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading recent jobs:', err);
              return null;
            }),

          // trabajos recientes de remotive para el job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/remotive-jobs/recent`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading Remotive recent jobs:', err);
              return null;
            }),

          // trabajos recientes de arbeitnow para el job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/arbeitnow-jobs/recent`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading Arbeitnow recent jobs:', err);
              return null;
            }),

          // trabajos recientes de jsearch para el job board
          authenticatedFetch(`${BACKEND_URL}/api/v1/jsearch-jobs/recent`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading JSearch recent jobs:', err);
              return null;
            })
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
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadData();
  }, [authenticatedFetch]);

  return { stats, mapData, chatAnalytics, recentJobs, remotiveRecentJobs, arbeitnowRecentJobs, jsearchRecentJobs, loading, error };
};