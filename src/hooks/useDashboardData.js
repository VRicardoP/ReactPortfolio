import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = 'http://127.0.0.1:8000';

export const useDashboardData = () => {
  const { authenticatedFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [jobicyData, setJobicyData] = useState(null);
  const [remotiveData, setRemotiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Cargar estadísticas generales
        const statsResponse = await authenticatedFetch(
          `${BACKEND_URL}/api/v1/analytics/stats?days=30`
        );
        const statsData = await statsResponse.json();
        setStats(statsData);

        // Cargar datos del mapa
        const mapResponse = await authenticatedFetch(
          `${BACKEND_URL}/api/v1/analytics/map-data`
        );
        const mapDataPoints = await mapResponse.json();
        setMapData(mapDataPoints);

        // Cargar datos de Jobicy
        const jobicyResponse = await authenticatedFetch(
          `${BACKEND_URL}/api/v1/jobicy-jobs/tech-jobs-by-country`
        );
        const jobicyJson = await jobicyResponse.json();
        setJobicyData(jobicyJson);

        // Cargar datos de Remotive
        const remotiveResponse = await authenticatedFetch(
          `${BACKEND_URL}/api/v1/remotive-jobs/by-tag`
        );
        const remotiveJson = await remotiveResponse.json();
        setRemotiveData(remotiveJson);

        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, [authenticatedFetch]);

  return { stats, mapData, jobicyData, remotiveData, loading, error };
};