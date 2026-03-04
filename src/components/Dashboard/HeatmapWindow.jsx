import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import FloatingWindow from '../Windows/FloatingWindow';
import { useTheme } from '../../context/ThemeContext';
import { useHeatmapData } from '../../hooks/useHeatmapData';
import '../../styles/dashboard-forms.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

/** Render heatmap dots on a canvas using radial gradients. */
function renderHeatmap(canvas, points, theme) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // Grid lines for reference
    ctx.strokeStyle = `rgba(${theme.primaryRgb}, 0.08)`;
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo((w / 10) * i, 0);
        ctx.lineTo((w / 10) * i, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, (h / 10) * i);
        ctx.lineTo(w, (h / 10) * i);
        ctx.stroke();
    }

    if (!points || points.length === 0) {
        ctx.fillStyle = `rgba(${theme.primaryRgb}, 0.3)`;
        ctx.font = '12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('No data', w / 2, h / 2);
        return;
    }

    const maxCount = Math.max(...points.map(p => p.count), 1);

    // Draw heat points
    ctx.globalCompositeOperation = 'lighter';
    points.forEach(({ x, y, count }) => {
        const px = x * w;
        const py = y * h;
        const intensity = count / maxCount;
        const radius = 12 + intensity * 28;

        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        if (intensity < 0.33) {
            gradient.addColorStop(0, `rgba(0, 100, 255, ${0.25 + intensity * 0.6})`);
        } else if (intensity < 0.66) {
            gradient.addColorStop(0, `rgba(0, 255, 200, ${0.3 + intensity * 0.5})`);
        } else {
            gradient.addColorStop(0, `rgba(255, 80, 0, ${0.4 + intensity * 0.4})`);
        }
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
}

/** Format milliseconds as human-readable duration. */
function formatDuration(ms) {
    if (ms == null) return 'N/A';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

/** Clean window ID for display (e.g. "profile-window" → "Profile"). */
function cleanWindowId(id) {
    return (id || 'unknown')
        .replace('-window', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

const HeatmapWindow = memo(({ initialPosition }) => {
    const [activeTab, setActiveTab] = useState('heatmap');
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { heatmapData, engagementStats, loading } = useHeatmapData();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Draw heatmap when data or tab changes
    const drawHeatmap = useCallback(() => {
        if (canvasRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = rect.width * dpr;
            canvasRef.current.height = rect.height * dpr;
            canvasRef.current.style.width = `${rect.width}px`;
            canvasRef.current.style.height = `${rect.height}px`;
            canvasRef.current.getContext('2d').scale(dpr, dpr);
            renderHeatmap(canvasRef.current, heatmapData, theme);
        }
    }, [heatmapData, theme]);

    useEffect(() => {
        if (activeTab !== 'heatmap') return;
        // Small delay to let the container size settle
        const timer = setTimeout(drawHeatmap, 50);
        return () => clearTimeout(timer);
    }, [activeTab, drawHeatmap]);

    // ResizeObserver for responsive canvas
    useEffect(() => {
        if (activeTab !== 'heatmap' || !containerRef.current) return;
        const observer = new ResizeObserver(drawHeatmap);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [activeTab, drawHeatmap]);

    // Chart.js configs
    const barOptions = useMemo(() => ({
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: theme.primary,
                bodyColor: theme.text,
                borderColor: theme.primary,
                borderWidth: 1,
                callbacks: {
                    label: (ctx) => formatDuration(ctx.raw),
                },
            }
        },
        scales: {
            x: {
                grid: { color: `rgba(${theme.primaryRgb}, 0.1)` },
                ticks: {
                    color: theme.text,
                    font: { family: 'Courier New', size: 10 },
                    callback: (v) => formatDuration(v),
                },
            },
            y: {
                grid: { display: false },
                ticks: { color: theme.text, font: { family: 'Courier New', size: 10 } },
            }
        }
    }), [theme]);

    const doughnutOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: theme.text,
                    font: { family: 'Courier New', size: 10 },
                    boxWidth: 12,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: theme.primary,
                bodyColor: theme.text,
                borderColor: theme.primary,
                borderWidth: 1,
            }
        }
    }), [theme]);

    const timelineOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: theme.primary,
                bodyColor: theme.text,
                borderColor: theme.primary,
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                grid: { color: `rgba(${theme.primaryRgb}, 0.1)` },
                ticks: { color: theme.text, font: { family: 'Courier New', size: 10 } },
            },
            y: {
                beginAtZero: true,
                grid: { color: `rgba(${theme.primaryRgb}, 0.1)` },
                ticks: { color: theme.text, font: { family: 'Courier New' } },
            }
        }
    }), [theme]);

    // Chart data
    const focusChartData = useMemo(() => {
        if (!engagementStats?.window_focus_times?.length) return null;
        const items = engagementStats.window_focus_times.slice(0, 10);
        return {
            labels: items.map(w => cleanWindowId(w.window_id)),
            datasets: [{
                data: items.map(w => w.total_ms),
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [engagementStats, theme]);

    const clicksChartData = useMemo(() => {
        if (!engagementStats?.clicks_by_area?.length) return null;
        const items = engagementStats.clicks_by_area.slice(0, 8);
        return {
            labels: items.map(c => cleanWindowId(c.area)),
            datasets: [{
                data: items.map(c => c.count),
                backgroundColor: theme.chartColors,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [engagementStats, theme]);

    const timelineData = useMemo(() => {
        if (!engagementStats?.sessions_timeline?.length) return null;
        const items = engagementStats.sessions_timeline.slice(-14);
        return {
            labels: items.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
            }),
            datasets: [{
                label: t('dashboard.heatmap.sessionsPerDay'),
                data: items.map(d => d.count),
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [engagementStats, theme, t]);

    const hasData = heatmapData?.length > 0 || (engagementStats && engagementStats.total_sessions > 0);

    return (
        <FloatingWindow
            id="heatmap-window"
            title={t('dashboard.heatmap.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 580, height: 480 }}
        >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {loading && (
                    <div className="dash-status-text dash-status-text--muted">
                        {t('dashboard.loading')}
                    </div>
                )}

                {!loading && !hasData && (
                    <div className="chat-notice" style={{ color: theme.warning }}>
                        {t('dashboard.heatmap.noData')}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        className={`dash-tab${activeTab === 'heatmap' ? ' dash-tab--active' : ''}`}
                        onClick={() => setActiveTab('heatmap')}
                    >
                        {t('dashboard.heatmap.tabHeatmap')}
                    </button>
                    <button
                        className={`dash-tab${activeTab === 'engagement' ? ' dash-tab--active' : ''}`}
                        onClick={() => setActiveTab('engagement')}
                    >
                        {t('dashboard.heatmap.tabEngagement')}
                    </button>
                    <button
                        className={`dash-tab${activeTab === 'timeline' ? ' dash-tab--active' : ''}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        {t('dashboard.heatmap.tabTimeline')}
                    </button>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'heatmap' && (
                        <div ref={containerRef} className="heatmap-canvas-container">
                            <canvas ref={canvasRef} className="heatmap-canvas" />
                            <div className="heatmap-legend">
                                <span style={{ color: theme.text }}>{t('dashboard.heatmap.last30days')}</span>
                                <div className="heatmap-legend-gradient" />
                                <span style={{ color: theme.text, fontSize: '9px' }}>
                                    {t('dashboard.heatmap.totalClicks')}: {engagementStats?.total_clicks || 0}
                                </span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'engagement' && (
                        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '5px' }}>
                            <div className="chat-stats-grid">
                                <div className="chat-stat-card">
                                    <div className="chat-stat-label">{t('dashboard.heatmap.totalSessions')}</div>
                                    <div className="chat-stat-value">{engagementStats?.total_sessions || 0}</div>
                                </div>
                                <div className="chat-stat-card">
                                    <div className="chat-stat-label">{t('dashboard.heatmap.avgDuration')}</div>
                                    <div className="chat-stat-value">
                                        {formatDuration(engagementStats?.avg_session_duration_ms)}
                                    </div>
                                </div>
                                <div className="chat-stat-card">
                                    <div className="chat-stat-label">{t('dashboard.heatmap.totalClicks')}</div>
                                    <div className="chat-stat-value">{engagementStats?.total_clicks || 0}</div>
                                </div>
                                <div className="chat-stat-card">
                                    <div className="chat-stat-label">{t('dashboard.heatmap.focusEvents')}</div>
                                    <div className="chat-stat-value">{engagementStats?.total_focus_events || 0}</div>
                                </div>
                            </div>

                            {focusChartData && (
                                <>
                                    <div className="chat-section-heading" style={{ marginTop: '10px' }}>
                                        {t('dashboard.heatmap.windowFocusTime')}
                                    </div>
                                    <div style={{ height: '200px' }}>
                                        <Bar data={focusChartData} options={barOptions} />
                                    </div>
                                </>
                            )}

                            {clicksChartData && (
                                <>
                                    <div className="chat-section-heading" style={{ marginTop: '10px' }}>
                                        {t('dashboard.heatmap.clickDistribution')}
                                    </div>
                                    <div style={{ height: '180px' }}>
                                        <Doughnut data={clicksChartData} options={doughnutOptions} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div style={{ flex: 1, minHeight: 0, padding: '10px' }}>
                            {timelineData ? (
                                <Bar data={timelineData} options={timelineOptions} />
                            ) : (
                                <div className="dash-status-text dash-status-text--muted">
                                    {t('dashboard.heatmap.noData')}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

HeatmapWindow.displayName = 'HeatmapWindow';

export default HeatmapWindow;
