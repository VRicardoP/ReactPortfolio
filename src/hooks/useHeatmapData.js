/**
 * Fetches heatmap and engagement data from the backend.
 * Used by HeatmapWindow in the dashboard.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

export const useHeatmapData = () => {
    const { authenticatedFetch } = useAuth();
    const [heatmapData, setHeatmapData] = useState(null);
    const [engagementStats, setEngagementStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let aborted = false;

        const load = async () => {
            try {
                const [heatmap, engagement] = await Promise.all([
                    authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/heatmap-data?days=30`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null),
                    authenticatedFetch(`${BACKEND_URL}/api/v1/analytics/engagement-stats?days=30`)
                        .then(r => r.ok ? r.json() : null)
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
