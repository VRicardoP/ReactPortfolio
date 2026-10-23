import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function useChartTheme() {
    const { theme } = useTheme();

    return useMemo(() => {
        const tooltip = {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: theme.primary,
            bodyColor: theme.text,
            borderColor: theme.primary,
            borderWidth: 1,
        };
        const ticks = { color: theme.text, font: { family: 'Courier New', size: 10 } };
        const grid = { color: `rgba(${theme.primaryRgb}, 0.1)` };
        const barOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip },
            scales: {
                x: { grid, ticks },
                y: { beginAtZero: true, grid, ticks },
            },
        };
        return {
            barOptions,
            hBarOptions: {
                ...barOptions,
                indexAxis: 'y',
                scales: {
                    x: { grid, ticks },
                    y: { grid: { display: false }, ticks },
                },
            },
            doughnutOptions: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: theme.text, font: { family: 'Courier New', size: 10 }, boxWidth: 12 },
                    },
                    tooltip,
                },
            },
        };
    }, [theme]);
}
