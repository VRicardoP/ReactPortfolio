import { memo, useMemo, useState } from 'react';
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

const ChatAnalyticsWindow = memo(({ data, initialPosition }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const { theme } = useTheme();
    const { t } = useTranslation();

    const stats = useMemo(() => {
        if (!data?.general) return null;
        return data.general;
    }, [data]);

    const topQuestions = useMemo(() => {
        if (!data?.top_questions) return [];
        return data.top_questions.slice(0, 5);
    }, [data]);

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

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: theme.primary,
                bodyColor: theme.text,
                borderColor: theme.primary,
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: { color: `rgba(${theme.primaryRgb}, 0.1)` },
                ticks: { color: theme.text, font: { family: 'Courier New', size: 10 } }
            },
            y: {
                beginAtZero: true,
                grid: { color: `rgba(${theme.primaryRgb}, 0.1)` },
                ticks: { color: theme.text, font: { family: 'Courier New' } }
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
                    boxWidth: 12
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: theme.primary,
                bodyColor: theme.text,
                borderColor: theme.primary,
                borderWidth: 1
            }
        }
    }), [theme]);

    const hasData = data && (data.general || (data.top_questions && data.top_questions.length > 0) || (data.timeline_daily && data.timeline_daily.length > 0));

    return (
        <FloatingWindow
            id="chat-analytics-window"
            title={t('dashboard.chatAnalytics.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 550, height: 500 }}
        >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!hasData && (
                    <div className="chat-notice" style={{ color: theme.warning }}>
                        {t('dashboard.chatAnalytics.waitingForQuestions')}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className={`dash-tab${activeTab === 'overview' ? ' dash-tab--active' : ''}`} onClick={() => setActiveTab('overview')}>
                        {t('dashboard.chatAnalytics.tabOverview')}
                    </button>
                    <button className={`dash-tab${activeTab === 'questions' ? ' dash-tab--active' : ''}`} onClick={() => setActiveTab('questions')}>
                        {t('dashboard.chatAnalytics.tabQuestions')}
                    </button>
                    <button className={`dash-tab${activeTab === 'timeline' ? ' dash-tab--active' : ''}`} onClick={() => setActiveTab('timeline')}>
                        {t('dashboard.chatAnalytics.tabTimeline')}
                    </button>
                    <button className={`dash-tab${activeTab === 'countries' ? ' dash-tab--active' : ''}`} onClick={() => setActiveTab('countries')}>
                        {t('dashboard.chatAnalytics.tabCountries')}
                    </button>
                </div>

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
