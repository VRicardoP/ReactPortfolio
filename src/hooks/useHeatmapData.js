/**
 * Fetches heatmap and engagement data from the backend.
 * Used by HeatmapWindow in the dashboard.
 */
// Trae del servidor los datos del mapa de calor de clics y las estadísticas
// de uso, para mostrarlos en la ventana del panel de administración.
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

export const useHeatmapData = () => {
    const { authenticatedFetch } = useAuth();
    const [heatmapData, setHeatmapData] = useState(null);
    const [engagementStats, setEngagementStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pide los dos conjuntos de datos a la vez en cuanto se abre la ventana.
    useEffect(() => {
        let aborted = false;

        const load = async () => {
            try {
                const [heatmap, engagement] = await Promise.all([
                    // DT-187: antes `r.ok ? r.json() : null`; la rama null era
                    // inalcanzable porque `authenticatedFetch` ya lanza.
                    authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/heatmap-data?days=30`)
                        .then(r => r.json())
                        .catch(() => null),
                    authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/engagement-stats?days=30`)
                        .then(r => r.json())
                        .catch(() => null),
                ]);
                if (!aborted) {
                    setHeatmapData(heatmap);
                    setEngagementStats(engagement);
                    setLoading(false);
                }
            } catch {
                if (!aborted) setLoading(false);
            }
        };

        load();
        return () => { aborted = true; };
    }, [authenticatedFetch]);

    return { heatmapData, engagementStats, loading };
};
