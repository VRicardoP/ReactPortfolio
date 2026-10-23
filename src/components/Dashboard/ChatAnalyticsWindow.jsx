// Ventana del panel con las estadísticas del chatbot, en cuatro pestañas:
// un resumen numérico, las preguntas más frecuentes, un gráfico de
// preguntas por día, y un gráfico de preguntas por país.

import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../../charts/register';
import useChartTheme from '../../hooks/useChartTheme';
import TabBar from '../UI/TabBar';
import FloatingWindow from '../Windows/FloatingWindow';
import { WINDOW_SIZES } from '../../config/windowSizes';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/dashboard-forms.css';


const ChatAnalyticsWindow = memo(({ data, initialPosition }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { barOptions: chartOptions, doughnutOptions } = useChartTheme();

    // Las estadísticas generales (totales, tasa de éxito...).
    const stats = useMemo(() => {
        if (!data?.general) return null;
        return data.general;
    }, [data]);

    // Las 5 preguntas más repetidas.
    const topQuestions = useMemo(() => {
        if (!data?.top_questions) return [];
        return data.top_questions.slice(0, 5);
    }, [data]);

    // Prepara los datos del gráfico de barras de preguntas por día (últimos 7 días).
    const dailyTimeline = useMemo(() => {
        if (!data?.timeline_daily || data.timeline_daily.length === 0) return null;
        const timeline = data.timeline_daily.slice(-7);
        return {
            labels: timeline.map(d => {
                const date = new Date(d.period);
                return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: t('dashboard.chatAnalytics.questionsPerDay'),
                data: timeline.map(d => d.count),
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1
            }]
        };
    }, [data, theme, t]);

    // Prepara los datos del gráfico de tarta de preguntas por país (top 5).
    const countryData = useMemo(() => {
        if (!data?.by_country || data.by_country.length === 0) return null;
        const countries = data.by_country.slice(0, 5);
        return {
            labels: countries.map(c => c.country || t('dashboard.chatAnalytics.unknown')),
            datasets: [{
                data: countries.map(c => c.count),
                backgroundColor: theme.chartColors,
                borderColor: theme.primary,
                borderWidth: 1
            }]
        };
    }, [data, theme, t]);



    const hasData = data && (data.general || (data.top_questions && data.top_questions.length > 0) || (data.timeline_daily && data.timeline_daily.length > 0));

    return (
        <FloatingWindow
            id="chat-analytics-window"
            title={t('dashboard.chatAnalytics.title')}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.chatAnalytics}
        >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!hasData && (
                    <div className="chat-notice" style={{ color: theme.warning }}>
                        {t('dashboard.chatAnalytics.waitingForQuestions')}
                    </div>
                )}
                <TabBar
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                    tabClassName="dash-tab"
                    activeClassName="dash-tab--active"
                    ariaLabel={t('dashboard.chatAnalytics.title')}
                    active={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { key: 'overview', label: t('dashboard.chatAnalytics.tabOverview') },
                        { key: 'questions', label: t('dashboard.chatAnalytics.tabQuestions') },
                        { key: 'timeline', label: t('dashboard.chatAnalytics.tabTimeline') },
                        { key: 'countries', label: t('dashboard.chatAnalytics.tabCountries') },
                    ]}
                />

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'overview' && (
                        <div className="chat-stats-grid">
                            <div className="chat-stat-card">
                                <div className="chat-stat-label">{t('dashboard.chatAnalytics.totalQuestions')}</div>
                                <div className="chat-stat-value">{stats?.total_questions || 0}</div>
                            </div>
                            <div className="chat-stat-card">
                                <div className="chat-stat-label">{t('dashboard.chatAnalytics.successRate')}</div>
                                <div className="chat-stat-value">
                                    {stats?.success_rate != null ? `${stats.success_rate.toFixed(1)}%` : 'N/A'}
                                </div>
                            </div>
                            <div className="chat-stat-card">
                                <div className="chat-stat-label">{t('dashboard.chatAnalytics.avgResponseTime')}</div>
                                <div className="chat-stat-value">
                                    {stats?.avg_response_time_ms ? `${stats.avg_response_time_ms.toFixed(0)}ms` : 'N/A'}
                                </div>
                            </div>
                            <div className="chat-stat-card">
                                <div className="chat-stat-label">{t('dashboard.chatAnalytics.questionsToday')}</div>
                                <div className="chat-stat-value">{stats?.questions_today || 0}</div>
                            </div>
                            <div className="chat-stat-card">
                                <div className="chat-stat-label">{t('dashboard.chatAnalytics.thisWeek')}</div>
                                <div className="chat-stat-value">{stats?.questions_this_week || 0}</div>
                            </div>
                            <div className="chat-stat-card">
                                <div className="chat-stat-label">{t('dashboard.chatAnalytics.thisMonth')}</div>
                                <div className="chat-stat-value">{stats?.questions_this_month || 0}</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'questions' && (
                        <div style={{ padding: '5px' }}>
                            <div className="chat-section-heading">
                                {t('dashboard.chatAnalytics.mostFrequentQuestions')}
                            </div>
                            {topQuestions.length > 0 ? (
                                <ul className="chat-question-list">
                                    {topQuestions.map((q, i) => (
                                        <li key={i} className="chat-question-item">
                                            <span className="chat-question-rank">#{i + 1}</span>
                                            <span className="chat-question-text">
                                                {q.question}
                                            </span>
                                            <span className="chat-question-count">x{q.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="dash-status-text dash-status-text--muted">
                                    {t('dashboard.chatAnalytics.noQuestionsYet')}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div style={{ flex: 1, minHeight: 0, padding: '10px' }}>
                            {dailyTimeline ? (
                                <Bar data={dailyTimeline} options={chartOptions} />
                            ) : (
                                <div className="dash-status-text dash-status-text--muted">
                                    {t('dashboard.chatAnalytics.noTimelineData')}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'countries' && (
                        <div style={{ flex: 1, minHeight: 0, padding: '10px' }}>
                            {countryData ? (
                                <Doughnut data={countryData} options={doughnutOptions} />
                            ) : (
                                <div className="dash-status-text dash-status-text--muted">
                                    {t('dashboard.chatAnalytics.noCountryData')}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

ChatAnalyticsWindow.displayName = 'ChatAnalyticsWindow';

export default ChatAnalyticsWindow;
