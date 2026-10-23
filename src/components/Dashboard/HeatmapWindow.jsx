// Ventana del panel que muestra el mapa de calor de clics (dibujado a
// mano en un canvas), además de gráficos de tiempo de atención por
// ventana, distribución de clics, y sesiones por día.

import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../../charts/register';
import useChartTheme from '../../hooks/useChartTheme';
import useEngagementCharts, { formatDuration } from '../../hooks/useEngagementCharts';
import useHeatmapCanvas from '../../hooks/useHeatmapCanvas';
import TabBar from '../UI/TabBar';
import FloatingWindow from '../Windows/FloatingWindow';
import { useTheme } from '../../context/ThemeContext';
import { useHeatmapData } from '../../hooks/useHeatmapData';
import { WINDOW_SIZES } from '../../config/windowSizes';
import '../../styles/dashboard-forms.css';

const HeatmapWindow = memo(({ initialPosition }) => {
    const [activeTab, setActiveTab] = useState('heatmap');
    const { theme } = useTheme();
    const { barOptions: timelineOptions, hBarOptions, doughnutOptions } = useChartTheme();
    const { t } = useTranslation();
    const { heatmapData, engagementStats, loading } = useHeatmapData();
    const { canvasRef, containerRef } = useHeatmapCanvas(
        activeTab === 'heatmap', heatmapData, theme
    );
    const {
        focusOptions: barOptions,
        focusData: focusChartData,
        clicksData: clicksChartData,
        timelineData,
    } = useEngagementCharts(engagementStats, theme, t, hBarOptions);

    const hasData = heatmapData?.length > 0 || (engagementStats && engagementStats.total_sessions > 0);

    return (
        <FloatingWindow
            id="heatmap-window"
            title={t('dashboard.heatmap.title')}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.heatmap}
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

                <TabBar
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                    tabClassName="dash-tab"
                    activeClassName="dash-tab--active"
                    ariaLabel={t('dashboard.heatmap.title')}
                    active={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { key: 'heatmap', label: t('dashboard.heatmap.tabHeatmap') },
                        { key: 'engagement', label: t('dashboard.heatmap.tabEngagement') },
                        { key: 'timeline', label: t('dashboard.heatmap.tabTimeline') },
                    ]}
                />

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
