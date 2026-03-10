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
import { JOB_SOURCES, extractJobs } from '../../config/jobSources';
import FloatingWindow from '../Windows/FloatingWindow';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const SALARY_BUCKETS = [
    { label: '<50k', min: 0, max: 50000 },
    { label: '50-75k', min: 50000, max: 75000 },
    { label: '75-100k', min: 75000, max: 100000 },
    { label: '100-150k', min: 100000, max: 150000 },
    { label: '150k+', min: 150000, max: Infinity },
];

const getMidSalary = (job) => {
    const minSal = job.job_min_salary || job.min_salary || 0;
    const maxSal = job.job_max_salary || job.max_salary || 0;
    if (minSal > 0 && maxSal > 0) return (minSal + maxSal) / 2;
    return minSal || maxSal;
};

const MARKET_TABS = ['skills', 'remote', 'sources'];
const SALARY_TABS = ['ranges', 'byType', 'bySource'];

const TAB_I18N_KEY = {
    skills: 'dashboard.jobAnalytics.tabSkills',
    remote: 'dashboard.jobAnalytics.tabRemote',
    sources: 'dashboard.jobAnalytics.tabSources',
    ranges: 'dashboard.salary.tabRanges',
    byType: 'dashboard.salary.tabByType',
    bySource: 'dashboard.salary.tabBySource',
};

const JobMarketAnalyticsWindow = memo(({ jobData, initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [section, setSection] = useState('market');
    const [marketTab, setMarketTab] = useState('skills');
    const [salaryTab, setSalaryTab] = useState('ranges');

    // Aggregate all jobs from all sources
    const allJobs = useMemo(() => {
        if (!jobData) return [];
        const jobs = [];
        JOB_SOURCES.forEach(({ key, skillsField, alwaysRemote }) => {
            const rawJobs = extractJobs(jobData[key]);
            rawJobs.forEach(j => {
                const skills = skillsField ? (j[skillsField] || j.tags || []) : [];
                jobs.push({
                    ...j,
                    skills,
                    remote: alwaysRemote || j.remote === true,
                    source: key.charAt(0).toUpperCase() + key.slice(1),
                });
            });
        });
        return jobs;
    }, [jobData]);

    // --- Market charts ---
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

    // --- Salary charts ---
    const jobsWithSalary = useMemo(() => {
        return allJobs.filter(job => {
            const minSal = job.job_min_salary || job.min_salary || 0;
            const maxSal = job.job_max_salary || job.max_salary || 0;
            return minSal > 0 || maxSal > 0;
        });
    }, [allJobs]);

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

    // --- Shared chart options ---
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

    if (allJobs.length === 0) {
        return (
            <FloatingWindow
                id="job-analytics-window"
                title={t('dashboard.jobAnalytics.title')}
                initialPosition={initialPosition}
                initialSize={{ width: 600, height: 500 }}
            >
                <div style={{ padding: '20px', color: theme.text, fontFamily: 'Courier New', textAlign: 'center' }}>
                    {t('dashboard.jobAnalytics.noData')}
                </div>
            </FloatingWindow>
        );
    }

    const activeTab = section === 'market' ? marketTab : salaryTab;
    const setActiveTab = section === 'market' ? setMarketTab : setSalaryTab;
    const tabs = section === 'market' ? MARKET_TABS : SALARY_TABS;

    const renderChart = () => {
        if (section === 'market') {
            if (marketTab === 'skills') return <Bar data={skillsChartData} options={chartOptions} />;
            if (marketTab === 'remote') return <Doughnut data={remoteChartData} options={doughnutOptions} />;
            if (marketTab === 'sources') return <Bar data={sourceChartData} options={chartOptions} />;
        }
        if (jobsWithSalary.length === 0) {
            return (
                <div style={{ padding: '20px', color: theme.text, fontFamily: 'Courier New', textAlign: 'center' }}>
                    {t('dashboard.salary.noData')}
                </div>
            );
        }
        if (salaryTab === 'ranges') return <Bar data={rangesChartData} options={chartOptions} />;
        if (salaryTab === 'byType') return <Bar data={byTypeChartData} options={chartOptions} />;
        if (salaryTab === 'bySource') return <Bar data={bySourceChartData} options={chartOptions} />;
        return null;
    };

    return (
        <FloatingWindow
            id="job-analytics-window"
            title={t('dashboard.jobAnalytics.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 600, height: 500 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '8px' }}>
                {/* Section selector */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                        className={`dash-tab${section === 'market' ? ' dash-tab--active' : ''}`}
                        onClick={() => setSection('market')}
                    >
                        {t('dashboard.jobAnalytics.sectionMarket')}
                    </button>
                    <button
                        className={`dash-tab${section === 'salary' ? ' dash-tab--active' : ''}`}
                        onClick={() => setSection('salary')}
                    >
                        {t('dashboard.jobAnalytics.sectionSalary')}
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: theme.text, opacity: 0.6, fontFamily: 'Courier New' }}>
                        {section === 'market'
                            ? `${allJobs.length} jobs`
                            : `${jobsWithSalary.length} ${t('dashboard.salary.jobsWithSalary')}`
                        }
                    </span>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: '6px' }} role="tablist" aria-label={t('dashboard.jobAnalytics.title')}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`dash-tab${activeTab === tab ? ' dash-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {t(TAB_I18N_KEY[tab])}
                        </button>
                    ))}
                </div>

                {/* Chart */}
                <div style={{ flex: 1, minHeight: 0 }}>
                    {renderChart()}
                </div>
            </div>
        </FloatingWindow>
    );
});

JobMarketAnalyticsWindow.displayName = 'JobMarketAnalyticsWindow';

export default JobMarketAnalyticsWindow;
