import { useMemo } from 'react';

export const formatDuration = (milliseconds) => {
    if (milliseconds == null) return 'N/A';
    if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
    return `${(milliseconds / 60000).toFixed(1)}m`;
};

const cleanWindowId = (id) => (id || 'unknown')
    .replace('-window', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

// Prepara opciones y datasets de atención, clics y sesiones.
const useEngagementCharts = (stats, theme, t, horizontalBarOptions) => {
    const focusOptions = useMemo(() => ({
        ...horizontalBarOptions,
        plugins: {
            ...horizontalBarOptions.plugins,
            tooltip: {
                ...horizontalBarOptions.plugins.tooltip,
                callbacks: { label: context => formatDuration(context.raw) },
            },
        },
        scales: {
            ...horizontalBarOptions.scales,
            x: {
                ...horizontalBarOptions.scales.x,
                ticks: {
                    ...horizontalBarOptions.scales.x.ticks,
                    callback: value => formatDuration(value),
                },
            },
        },
    }), [horizontalBarOptions]);

    const focusData = useMemo(() => {
        if (!stats?.window_focus_times?.length) return null;
        const items = stats.window_focus_times.slice(0, 10);
        return {
            labels: items.map(item => cleanWindowId(item.window_id)),
            datasets: [{
                data: items.map(item => item.total_ms),
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [stats, theme]);

    const clicksData = useMemo(() => {
        if (!stats?.clicks_by_area?.length) return null;
        const items = stats.clicks_by_area.slice(0, 8);
        return {
            labels: items.map(item => cleanWindowId(item.area)),
            datasets: [{
                data: items.map(item => item.count),
                backgroundColor: theme.chartColors,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [stats, theme]);

    const timelineData = useMemo(() => {
        if (!stats?.sessions_timeline?.length) return null;
        const items = stats.sessions_timeline.slice(-14);
        return {
            labels: items.map(item => new Date(item.date).toLocaleDateString(
                undefined,
                { day: 'numeric', month: 'short' },
            )),
            datasets: [{
                label: t('dashboard.heatmap.sessionsPerDay'),
                data: items.map(item => item.count),
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [stats, theme, t]);

    return { focusOptions, focusData, clicksData, timelineData };
};

export default useEngagementCharts;
