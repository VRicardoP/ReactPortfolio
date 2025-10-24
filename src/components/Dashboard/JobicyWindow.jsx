import { memo, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import FloatingWindow from '../Windows/FloatingWindow';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const JobicyWindow = memo(({ data, initialPosition }) => {
    const chartData = useMemo(() => {
        if (!data?.data) return null;

        const entries = Object.entries(data.data)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15);

        return {
            labels: entries.map(([country]) => country),
            datasets: [{
                label: 'Job Offers by Country',
                data: entries.map(([, count]) => count),
                backgroundColor: 'rgba(0, 255, 255, 0.6)',
                borderColor: 'rgba(0, 255, 255, 1)',
                borderWidth: 1
            }]
        };
    }, [data]);

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: `Remote Jobs (Jobicy)${data?.metadata?.total_jobs ? ` - ${data.metadata.total_jobs} total` : ''}`,
                color: '#00ffff',
                font: {
                    size: 16,
                    family: 'Courier New'
                }
            },
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
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#D3D3D3',
                    font: {
                        family: 'Courier New'
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(0, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#D3D3D3',
                    font: {
                        family: 'Courier New'
                    }
                }
            }
        }
    };

    if (!chartData) {
        return (
            <FloatingWindow
                id="jobicy-window"
                title="Jobicy Jobs"
                initialPosition={initialPosition}
                initialSize={{ width: 500, height: 400 }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: '#D3D3D3'
                }}>
                    No job data available
                </div>
            </FloatingWindow>
        );
    }

    return (
        <FloatingWindow
            id="jobicy-window"
            title="Jobicy Jobs"
            initialPosition={initialPosition}
            initialSize={{ width: 550, height: 450 }}
        >
            <div style={{ height: '100%', width: '100%', padding: '10px' }}>
                <Bar data={chartData} options={options} />
                <p style={{
                    textAlign: 'center',
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#D3D3D3'
                }}>
                    Source: <a
                        href="https://jobicy.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#00ffff' }}
                    >
                        Jobicy.com
                    </a>
                </p>
            </div>
        </FloatingWindow>
    );
});

JobicyWindow.displayName = 'JobicyWindow';

export default JobicyWindow;