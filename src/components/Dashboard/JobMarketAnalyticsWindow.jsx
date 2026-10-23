// Ventana del panel con gráficos sobre el mercado de empleo: las
// habilidades más pedidas, cuántas ofertas son remotas, de qué fuente
// vienen, y un segundo bloque con estadísticas de salario (por rango,
// por tipo de contrato, por fuente).

import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../../charts/register';
import useChartTheme from '../../hooks/useChartTheme';
import { useTheme } from '../../context/ThemeContext';
import { JOB_SOURCES } from '../../config/jobSources';
import TabBar from '../UI/TabBar';
import FloatingWindow from '../Windows/FloatingWindow';


const SALARY_BUCKETS = [
    { label: '<50k', min: 0, max: 50000 },
    { label: '50-75k', min: 50000, max: 75000 },
    { label: '75-100k', min: 75000, max: 100000 },
    { label: '100-150k', min: 100000, max: 150000 },
    { label: '150k+', min: 150000, max: Infinity },
];

// Calcula el salario "medio" de una oferta (el punto intermedio entre su
// mínimo y su máximo, o el que haya si solo se conoce uno).
const getMidSalary = (job) => {
    const minSal = job.salaryMin || 0;
    const maxSal = job.salaryMax || 0;
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
    const { barOptions: chartOptions, doughnutOptions } = useChartTheme();
    const [section, setSection] = useState('market');
    const [marketTab, setMarketTab] = useState('skills');
    const [salaryTab, setSalaryTab] = useState('ranges');

    // Aggregate all jobs from all sources
    // Junta en una sola lista las ofertas de las 20 fuentes, con sus
    // habilidades y si son remotas.
    const allJobs = useMemo(() => {
        if (!jobData) return [];
        const jobs = [];
        JOB_SOURCES.forEach(({ key }) => {
            for (const job of jobData[key]?._normalized || []) {
                jobs.push({
                    ...job,
                    source: key.charAt(0).toUpperCase() + key.slice(1),
                });
            }
        });
        return jobs;
    }, [jobData]);

    // --- Market charts ---
    // Prepara el gráfico de las 10 habilidades más pedidas.
    const skillsChartData = useMemo(() => {
        const counts = {};
        allJobs.forEach(j => {
            j.tags.forEach(s => {
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

    // Prepara el gráfico de tarta remoto/presencial.
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

    // Prepara el gráfico de ofertas por fuente.
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
    // Se queda solo con las ofertas que tienen algún dato de salario.
    const jobsWithSalary = useMemo(() => {
        return allJobs.filter(job => {
            const minSal = job.salaryMin || 0;
            const maxSal = job.salaryMax || 0;
            return minSal > 0 || maxSal > 0;
        });
    }, [allJobs]);

    // Prepara el gráfico de cuántas ofertas hay en cada rango de salario.
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

    // Prepara el gráfico de salario medio por tipo de contrato.
    const byTypeChartData = useMemo(() => {
        const grouped = {};
        jobsWithSalary.forEach(job => {
            const empType = job.employmentType || 'Unknown';
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

    // Prepara el gráfico de salario medio por fuente.
    const bySourceChartData = useMemo(() => {
        const grouped = {};
        jobsWithSalary.forEach(job => {
            const source = job.publisher || job.source || 'Unknown';
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

    // Elige qué gráfico dibujar según la sección y la pestaña activas.
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
                    <TabBar
                        style={{ display: 'flex', gap: '6px' }}
                        tabClassName="dash-tab"
                        activeClassName="dash-tab--active"
                        ariaLabel={t('dashboard.jobAnalytics.title')}
                        active={section}
                        onChange={setSection}
                        tabs={[
                            { key: 'market', label: t('dashboard.jobAnalytics.sectionMarket') },
                            { key: 'salary', label: t('dashboard.jobAnalytics.sectionSalary') },
                        ]}
                    />
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: theme.text, opacity: 0.6, fontFamily: 'Courier New' }}>
                        {section === 'market'
                            ? `${allJobs.length} jobs`
                            : `${jobsWithSalary.length} ${t('dashboard.salary.jobsWithSalary')}`
                        }
                    </span>
                </div>

                {/* Sub-tabs */}
                <TabBar
                    style={{ display: 'flex', gap: '6px' }}
                    tabClassName="dash-tab"
                    activeClassName="dash-tab--active"
                    ariaLabel={t('dashboard.jobAnalytics.title')}
                    active={activeTab}
                    onChange={setActiveTab}
                    tabs={tabs.map(tab => ({ key: tab, label: t(TAB_I18N_KEY[tab]) }))}
                />
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
