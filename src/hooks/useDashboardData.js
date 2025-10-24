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
        setError(null);

        // Intentar cargar todos los datos en paralelo
        const promises = [
          // Estadísticas generales
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/stats?days=30`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading stats:', err);
              return null;
            }),

          // Datos del mapa
          authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/map-data`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading map data:', err);
              return [];
            }),

          // Datos de Jobicy
          authenticatedFetch(`${BACKEND_URL}/api/v1/jobicy-jobs/tech-jobs-by-country`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading Jobicy data:', err);
              return null;
            }),

          // Datos de Remotive
          authenticatedFetch(`${BACKEND_URL}/api/v1/remotive-jobs/by-tag`)
            .then(res => res.json())
            .catch(err => {
              console.error('Error loading Remotive data:', err);
              return null;
            })
        ];

        const [statsData, mapDataPoints, jobicyJson, remotiveJson] = await Promise.all(promises);

        setStats(statsData);
        setMapData(mapDataPoints);
        setJobicyData(jobicyJson);
        setRemotiveData(remotiveJson);

        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadData();
  }, [authenticatedFetch]);

  return { stats, mapData, jobicyData, remotiveData, loading, error };
};