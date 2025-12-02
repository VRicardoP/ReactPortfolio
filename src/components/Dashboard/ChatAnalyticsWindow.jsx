import { memo, useMemo, useState } from 'react';
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
                return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: 'Preguntas por día',
                data: timeline.map(d => d.count),
                backgroundColor: 'rgba(0, 255, 255, 0.6)',
                borderColor: 'rgba(0, 255, 255, 1)',
                borderWidth: 1
            }]
        };
    }, [data]);

    const countryData = useMemo(() => {
        if (!data?.by_country || data.by_country.length === 0) return null;
        const countries = data.by_country.slice(0, 5);
        return {
            labels: countries.map(c => c.country || 'Desconocido'),
            datasets: [{
                data: countries.map(c => c.count),
                backgroundColor: [
                    'rgba(0, 255, 255, 0.8)',
                    'rgba(0, 200, 200, 0.8)',
                    'rgba(0, 150, 150, 0.8)',
                    'rgba(0, 100, 100, 0.8)',
                    'rgba(0, 50, 50, 0.8)'
                ],
                borderColor: 'rgba(0, 255, 255, 1)',
                borderWidth: 1
            }]
        };
    }, [data]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#00ffff',
                bodyColor: '#D3D3D3',
                borderColor: '#00ffff',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(0, 255, 255, 0.1)' },
                ticks: { color: '#D3D3D3', font: { family: 'Courier New', size: 10 } }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 255, 255, 0.1)' },
                ticks: { color: '#D3D3D3', font: { family: 'Courier New' } }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: '#D3D3D3',
                    font: { family: 'Courier New', size: 10 },
                    boxWidth: 12
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#00ffff',
                bodyColor: '#D3D3D3',
                borderColor: '#00ffff',
                borderWidth: 1
            }
        }
    };

    const tabStyle = (isActive) => ({
        padding: '6px 12px',
        background: isActive ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
        border: `1px solid ${isActive ? '#00ffff' : 'rgba(0, 255, 255, 0.3)'}`,
        color: isActive ? '#00ffff' : '#D3D3D3',
        cursor: 'pointer',
        fontFamily: 'Courier New',
        fontSize: '11px',
        borderRadius: '4px',
        transition: 'all 0.2s'
    });

    // mostrar la ventana incluso si no hay datos, con valores por defecto
    const hasData = data && (data.general || (data.top_questions && data.top_questions.length > 0) || (data.timeline_daily && data.timeline_daily.length > 0));

    return (
        <FloatingWindow
            id="chat-analytics-window"
            title="Chat Analytics - Recruiter Insights"
            initialPosition={initialPosition}
            initialSize={{ width: 550, height: 500 }}
        >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!hasData && (
                    <div style={{
                        background: 'rgba(255, 200, 0, 0.1)',
                        border: '1px solid rgba(255, 200, 0, 0.3)',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: '#ffcc00',
                        fontFamily: 'Courier New'
                    }}>
                        Esperando preguntas de reclutadores en el chatbot...
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button style={tabStyle(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
                        Overview
                    </button>
                    <button style={tabStyle(activeTab === 'questions')} onClick={() => setActiveTab('questions')}>
                        Top Questions
                    </button>
                    <button style={tabStyle(activeTab === 'timeline')} onClick={() => setActiveTab('timeline')}>
                        Timeline
                    </button>
                    <button style={tabStyle(activeTab === 'countries')} onClick={() => setActiveTab('countries')}>
                        By Country
                    </button>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', padding: '5px' }}>
                            <div style={statCardStyle}>
                                <div style={statLabelStyle}>Total Preguntas</div>
                                <div style={statValueStyle}>{stats?.total_questions || 0}</div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={statLabelStyle}>Tasa de Éxito</div>
                                <div style={statValueStyle}>
                                    {stats?.success_rate != null ? `${stats.success_rate.toFixed(1)}%` : 'N/A'}
                                </div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={statLabelStyle}>Tiempo Resp. Promedio</div>
                                <div style={statValueStyle}>
                                    {stats?.avg_response_time_ms ? `${stats.avg_response_time_ms.toFixed(0)}ms` : 'N/A'}
                                </div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={statLabelStyle}>Preguntas Hoy</div>
                                <div style={statValueStyle}>{stats?.questions_today || 0}</div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={statLabelStyle}>Esta Semana</div>
                                <div style={statValueStyle}>{stats?.questions_this_week || 0}</div>
                            </div>
                            <div style={statCardStyle}>
                                <div style={statLabelStyle}>Este Mes</div>
                                <div style={statValueStyle}>{stats?.questions_this_month || 0}</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'questions' && (
                        <div style={{ padding: '5px' }}>
                            <div style={{ fontSize: '11px', color: '#00ffff', marginBottom: '10px', fontFamily: 'Courier New' }}>
                                Preguntas más frecuentes de reclutadores:
                            </div>
                            {topQuestions.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {topQuestions.map((q, i) => (
                                        <li key={i} style={questionItemStyle}>
                                            <span style={{ color: '#00ffff', marginRight: '8px' }}>#{i + 1}</span>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {q.question}
                                            </span>
                                            <span style={{ color: '#00ffff', marginLeft: '8px' }}>x{q.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div style={{ color: '#D3D3D3', textAlign: 'center', padding: '20px' }}>
                                    No hay preguntas registradas aún
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div style={{ flex: 1, minHeight: 0, padding: '10px' }}>
                            {dailyTimeline ? (
                                <Bar data={dailyTimeline} options={chartOptions} />
                            ) : (
                                <div style={{ color: '#D3D3D3', textAlign: 'center', padding: '20px' }}>
                                    No hay datos de timeline disponibles
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'countries' && (
                        <div style={{ flex: 1, minHeight: 0, padding: '10px' }}>
                            {countryData ? (
                                <Doughnut data={countryData} options={doughnutOptions} />
                            ) : (
                                <div style={{ color: '#D3D3D3', textAlign: 'center', padding: '20px' }}>
                                    No hay datos de países disponibles
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

const statCardStyle = {
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'center'
};

const statLabelStyle = {
    color: '#D3D3D3',
    fontSize: '10px',
    fontFamily: 'Courier New',
    textTransform: 'uppercase',
    marginBottom: '5px'
};

const statValueStyle = {
    color: '#00ffff',
    fontSize: '20px',
    fontFamily: 'Courier New',
    fontWeight: 'bold'
};

const questionItemStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    borderRadius: '4px',
    marginBottom: '6px',
    fontFamily: 'Courier New',
    fontSize: '11px',
    color: '#D3D3D3'
};

ChatAnalyticsWindow.displayName = 'ChatAnalyticsWindow';

export default ChatAnalyticsWindow;
