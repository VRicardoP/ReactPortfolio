import { memo, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import FloatingWindow from '../Windows/FloatingWindow';

const RemotiveWindow = memo(({ data, initialPosition }) => {
    const chartData = useMemo(() => {
        if (!data?.data) return null;

        const entries = Object.entries(data.data)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 15);

        return {
            labels: entries.map(([tag]) => tag),
            datasets: [{
                label: 'Job Offers by Tag',
                data: entries.map(([, count]) => count),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };
    }, [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: false
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
                grid: {
                    color: 'rgba(0, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#D3D3D3',
                    font: {
                        family: 'Courier New'
                    },
                    maxRotation: 45,
                    minRotation: 45
                }
            },
            y: {
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
            }
        }
    };

    if (!chartData) {
        return (
            <FloatingWindow
                id="remotive-window"
                title="Remotive Jobs"
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
            id="remotive-window"
            title="Remotive Jobs"
            initialPosition={initialPosition}
            initialSize={{ width: 550, height: 450 }}
        >
            <div style={{ height: '100%', width: '100%' }}>
                <Bar data={chartData} options={options} />
            </div>
        </FloatingWindow>
    );
});

RemotiveWindow.displayName = 'RemotiveWindow';

export default RemotiveWindow;