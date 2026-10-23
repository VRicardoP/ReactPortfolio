// Ventana del panel con gráficos sobre el mercado de empleo: las
// habilidades más pedidas, cuántas ofertas son remotas, de qué fuente
// vienen, y un segundo bloque con estadísticas de salario (por rango,
// por tipo de contrato, por fuente).

import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../../charts/register';
import useChartTheme from '../../hooks/useChartTheme';
import useJobMarketStats from '../../hooks/useJobMarketStats';
import { useTheme } from '../../context/ThemeContext';
import TabBar from '../UI/TabBar';
import FloatingWindow from '../Windows/FloatingWindow';


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
    const {
        allJobs,
        jobsWithSalary,
        skillsChartData,
        remoteChartData,
        sourceChartData,
        rangesChartData,
        byTypeChartData,
        bySourceChartData,
    } = useJobMarketStats(jobData, theme, t);



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
                            ? t('dashboard.jobAnalytics.jobCount', { count: allJobs.length })
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
