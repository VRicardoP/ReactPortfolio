/**
 * Fetches heatmap and engagement data from the backend.
 * Used by HeatmapWindow in the dashboard.
 */
// Trae del servidor los datos del mapa de calor de clics y las estadísticas
// de uso, para mostrarlos en la ventana del panel de administración.
import { BACKEND_URL } from '../config/api';
import useAuthenticatedQuery from './useAuthenticatedQuery';
import { STATS_WINDOW_DAYS } from '../components/Dashboard/dashboardConstants';

export const useHeatmapData = () => {
    const heatmap = useAuthenticatedQuery(
        `${BACKEND_URL}/api/v1/analytics/heatmap-data?days=${STATS_WINDOW_DAYS}`,
    );
    const engagement = useAuthenticatedQuery(
        `${BACKEND_URL}/api/v1/analytics/engagement-stats?days=${STATS_WINDOW_DAYS}`,
    );

    return {
        heatmapData: heatmap.data,
        engagementStats: engagement.data,
        loading: heatmap.loading || engagement.loading,
    };
};
