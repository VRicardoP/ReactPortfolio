import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useTheme } from '../../context/ThemeContext';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

const SALARY_BUCKETS = [
    { label: '<50k', min: 0, max: 50000 },
    { label: '50-75k', min: 50000, max: 75000 },
    { label: '75-100k', min: 75000, max: 100000 },
    { label: '100-150k', min: 100000, max: 150000 },
    { label: '150k+', min: 150000, max: Infinity },
];

const SalaryAnalyticsWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('ranges');

    // Normalize input data to a flat array of jobs
    const jobs = useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.jobs)) return data.jobs;
        return [];
    }, [data]);

    // Filter jobs that have salary info
    const jobsWithSalary = useMemo(() => {
        return jobs.filter(job => {
            const minSal = job.job_min_salary || job.min_salary || 0;
            const maxSal = job.job_max_salary || job.max_salary || 0;
            return minSal > 0 || maxSal > 0;
        });
    }, [jobs]);

    // Helper: get mid salary for a job
    const getMidSalary = (job) => {
        const minSal = job.job_min_salary || job.min_salary || 0;
        const maxSal = job.job_max_salary || job.max_salary || 0;
        if (minSal > 0 && maxSal > 0) return (minSal + maxSal) / 2;
        return minSal || maxSal;
    };

    // Tab 1: Salary ranges histogram
    const rangesChartData = useMemo(() => {
        const counts = SALARY_BUCKETS.map(() => 0);

        jobsWithSalary.forEach(job => {
            const mid = getMidSalary(job);
            for (let i = 0; i < SALARY_BUCKETS.length; i++) {
                if (mid >= SALARY_BUCKETS[i].min && mid < SALARY_BUCKETS[i].max) {
                    counts[i]++;
                    break;
                }
            }
        });

        return {
            labels: SALARY_BUCKETS.map(b => b.label),
            datasets: [{
                label: t('dashboard.salary.jobCount'),
                data: counts,
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [jobsWithSalary, theme, t]);

    // Tab 2: Average salary by employment type
    const byTypeChartData = useMemo(() => {
        const grouped = {};

        jobsWithSalary.forEach(job => {
            const empType = job.job_employment_type || job.employment_type || 'Unknown';
            if (!grouped[empType]) grouped[empType] = { total: 0, count: 0 };
            grouped[empType].total += getMidSalary(job);
            grouped[empType].count++;
        });

        const labels = Object.keys(grouped).sort();
        const averages = labels.map(l => Math.round(grouped[l].total / grouped[l].count));

        return {
            labels,
            datasets: [{
                label: t('dashboard.salary.avgSalary'),
                data: averages,
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [jobsWithSalary, theme, t]);

    // Tab 3: Average salary by publisher/source
    const bySourceChartData = useMemo(() => {
        const grouped = {};

        jobsWithSalary.forEach(job => {
            const source = job.job_publisher || job.publisher || job.source || 'Unknown';
            if (!grouped[source]) grouped[source] = { total: 0, count: 0 };
            grouped[source].total += getMidSalary(job);
            grouped[source].count++;
        });

        const labels = Object.keys(grouped).sort();
        const averages = labels.map(l => Math.round(grouped[l].total / grouped[l].count));

        return {
            labels,
            datasets: [{
                label: t('dashboard.salary.avgSalary'),
                data: averages,
                backgroundColor: (theme.chartColors || []).slice(0, labels.length).map(c =>
                    c || `rgba(${theme.primaryRgb}, 0.6)`
                ),
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [jobsWithSalary, theme, t]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: theme.primary,
                bodyColor: theme.text,
            },
        },
        scales: {
            x: {
                grid: { color: `rgba(${theme.primaryRgb}, 0.1)` },
                ticks: { color: theme.text, font: { family: 'Courier New', size: 10 } },
            },
            y: {
                beginAtZero: true,
                grid: { color: `rgba(${theme.primaryRgb}, 0.1)` },
                ticks: { color: theme.text, font: { family: 'Courier New', size: 10 } },
            },
        },
    }), [theme]);

    const tabStyle = (isActive) => ({
        padding: '6px 14px',
        background: isActive ? `rgba(${theme.primaryRgb}, 0.2)` : 'transparent',
        border: `1px solid ${isActive ? theme.primary : 'rgba(255,255,255,0.15)'}`,
        borderRadius: '4px',
        color: isActive ? theme.primary : theme.text,
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
    });

    // No salary data available
    if (jobsWithSalary.length === 0) {
        return (
            <FloatingWindow
                id="salary-analytics-window"
                title={t('dashboard.salary.title')}
                initialPosition={initialPosition}
                initialSize={{ width: 550, height: 450 }}
            >
                <div style={{ padding: '20px', color: theme.text, fontFamily: 'Courier New', textAlign: 'center' }}>
                    {t('dashboard.salary.noData')}
                </div>
            </FloatingWindow>
        );
    }

    return (
        <FloatingWindow
            id="salary-analytics-window"
            title={t('dashboard.salary.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 550, height: 450 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '10px' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button style={tabStyle(activeTab === 'ranges')} onClick={() => setActiveTab('ranges')}>
                        {t('dashboard.salary.tabRanges')}
                    </button>
                    <button style={tabStyle(activeTab === 'byType')} onClick={() => setActiveTab('byType')}>
                        {t('dashboard.salary.tabByType')}
                    </button>
                    <button style={tabStyle(activeTab === 'bySource')} onClick={() => setActiveTab('bySource')}>
                        {t('dashboard.salary.tabBySource')}
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: theme.text, opacity: 0.6, fontFamily: 'Courier New' }}>
                        {jobsWithSalary.length} {t('dashboard.salary.jobsWithSalary')}
                    </span>
                </div>

                {/* Chart area */}
                <div style={{ flex: 1, minHeight: 0 }}>
                    {activeTab === 'ranges' && <Bar data={rangesChartData} options={chartOptions} />}
                    {activeTab === 'byType' && <Bar data={byTypeChartData} options={chartOptions} />}
                    {activeTab === 'bySource' && <Bar data={bySourceChartData} options={chartOptions} />}
                </div>
            </div>
        </FloatingWindow>
    );
});

SalaryAnalyticsWindow.displayName = 'SalaryAnalyticsWindow';

export default SalaryAnalyticsWindow;
