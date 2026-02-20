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
    Legend,
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import FloatingWindow from '../Windows/FloatingWindow';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const JobMarketAnalyticsWindow = memo(({ jobData, initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('skills');

    // Aggregate all jobs from all 4 sources
    const allJobs = useMemo(() => {
        if (!jobData) return [];
        const { jobicy, remotive, arbeitnow, jsearch } = jobData;
        const jobs = [];

        // Jobicy
        if (jobicy?.data) {
            jobicy.data.forEach(j => jobs.push({
                skills: j.skills || [],
                remote: true,
                source: 'Jobicy',
            }));
        }

        // Remotive
        if (remotive?.data) {
            remotive.data.forEach(j => jobs.push({
                skills: j.tags || [],
                remote: true,
                source: 'Remotive',
            }));
        }

        // Arbeitnow
        if (arbeitnow?.data) {
            arbeitnow.data.forEach(j => jobs.push({
                skills: j.tags || [],
                remote: j.remote === true,
                source: 'Arbeitnow',
            }));
        }

        // JSearch
        const jsearchJobs = Array.isArray(jsearch) ? jsearch : (jsearch?.data || jsearch?.jobs || []);
        jsearchJobs.forEach(j => jobs.push({
            skills: [],
            remote: j.job_is_remote ?? j.is_remote ?? false,
            source: 'JSearch',
        }));

        return jobs;
    }, [jobData]);

    // Top skills
    const skillsChartData = useMemo(() => {
        const counts = {};
        allJobs.forEach(j => {
            j.skills.forEach(s => {
                const key = s.trim();
                if (key) counts[key] = (counts[key] || 0) + 1;
            });
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: t('dashboard.jobAnalytics.topSkills'),
                data: sorted.map(([, count]) => count),
                backgroundColor: `rgba(${theme.primaryRgb}, 0.6)`,
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [allJobs, theme, t]);

    // Remote vs on-site
    const remoteChartData = useMemo(() => {
        let remote = 0, onsite = 0;
        allJobs.forEach(j => j.remote ? remote++ : onsite++);
        return {
            labels: [t('dashboard.jobBoard.remote'), t('dashboard.jobBoard.onsite')],
            datasets: [{
                data: [remote, onsite],
                backgroundColor: [
                    `rgba(${theme.primaryRgb}, 0.6)`,
                    'rgba(255, 107, 107, 0.6)',
                ],
                borderColor: [theme.primary, '#ff6b6b'],
                borderWidth: 1,
            }],
        };
    }, [allJobs, theme, t]);

    // Jobs by source
    const sourceChartData = useMemo(() => {
        const counts = {};
        allJobs.forEach(j => { counts[j.source] = (counts[j.source] || 0) + 1; });
        const labels = Object.keys(counts);
        return {
            labels,
            datasets: [{
                label: t('dashboard.jobAnalytics.jobsBySource'),
                data: labels.map(l => counts[l]),
                backgroundColor: (theme.chartColors || []).slice(0, labels.length).map(c =>
                    c || `rgba(${theme.primaryRgb}, 0.6)`
                ),
                borderColor: theme.primary,
                borderWidth: 1,
            }],
        };
    }, [allJobs, theme, t]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: theme.primary, bodyColor: theme.text },
        },
        scales: {
            x: { grid: { color: `rgba(${theme.primaryRgb}, 0.1)` }, ticks: { color: theme.text, font: { family: 'Courier New', size: 10 } } },
            y: { beginAtZero: true, grid: { color: `rgba(${theme.primaryRgb}, 0.1)` }, ticks: { color: theme.text, font: { family: 'Courier New', size: 10 } } },
        },
    }), [theme]);

    const doughnutOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { color: theme.text, font: { family: 'Courier New', size: 11 }, boxWidth: 14 } },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' },
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
        transition: 'all 0.2s ease',
    });

    if (allJobs.length === 0) {
        return (
            <FloatingWindow
                id="job-analytics-window"
                title={t('dashboard.jobAnalytics.title')}
                initialPosition={initialPosition}
                initialSize={{ width: 550, height: 400 }}
            >
                <div style={{ padding: '20px', color: theme.text, fontFamily: 'Courier New', textAlign: 'center' }}>
                    {t('dashboard.jobAnalytics.noData')}
                </div>
            </FloatingWindow>
        );
    }

    return (
        <FloatingWindow
            id="job-analytics-window"
            title={t('dashboard.jobAnalytics.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 580, height: 480 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={tabStyle(activeTab === 'skills')} onClick={() => setActiveTab('skills')}>
                        {t('dashboard.jobAnalytics.tabSkills')}
                    </button>
                    <button style={tabStyle(activeTab === 'remote')} onClick={() => setActiveTab('remote')}>
                        {t('dashboard.jobAnalytics.tabRemote')}
                    </button>
                    <button style={tabStyle(activeTab === 'sources')} onClick={() => setActiveTab('sources')}>
                        {t('dashboard.jobAnalytics.tabSources')}
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: theme.text, opacity: 0.6, fontFamily: 'Courier New' }}>
                        {allJobs.length} jobs
                    </span>
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                    {activeTab === 'skills' && <Bar data={skillsChartData} options={chartOptions} />}
                    {activeTab === 'remote' && <Doughnut data={remoteChartData} options={doughnutOptions} />}
                    {activeTab === 'sources' && <Bar data={sourceChartData} options={chartOptions} />}
                </div>
            </div>
        </FloatingWindow>
    );
});

JobMarketAnalyticsWindow.displayName = 'JobMarketAnalyticsWindow';

export default JobMarketAnalyticsWindow;
