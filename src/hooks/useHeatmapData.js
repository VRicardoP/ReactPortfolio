/**
 * Fetches heatmap and engagement data from the backend.
 * Used by HeatmapWindow in the dashboard.
 */
// Trae del servidor los datos del mapa de calor de clics y las estadísticas
// de uso, para mostrarlos en la ventana del panel de administración.
import { BACKEND_URL } from '../config/api';
import useAuthenticatedQuery from './useAuthenticatedQuery';

export const useHeatmapData = () => {
    const heatmap = useAuthenticatedQuery(
        `${BACKEND_URL}/api/v1/analytics/heatmap-data?days=30`,
    );
    const engagement = useAuthenticatedQuery(
        `${BACKEND_URL}/api/v1/analytics/engagement-stats?days=30`,
    );

    return {
        heatmapData: heatmap.data,
        engagementStats: engagement.data,
        loading: heatmap.loading || engagement.loading,
    };
};
