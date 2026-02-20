import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';

const StatsWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();

    if (!data) {
        return (
            <FloatingWindow
                id="stats-window"
                title={t('dashboard.stats.title')}
                initialPosition={initialPosition}
                initialSize={{ width: 400, height: 300 }}
            >
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    {t('dashboard.stats.loading')}
                </div>
            </FloatingWindow>
        );
    }

    return (
        <FloatingWindow
            id="stats-window"
            title={t('dashboard.stats.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 450, height: 350 }}
        >
            <div className="stats-container">
                <div className="stat-card">
                    <h3>{t('dashboard.stats.totalVisitors')}</h3>
                    <p className="stat-value">{data.total_visitors || 0}</p>
                </div>

                <div className="stat-card">
                    <h3>{t('dashboard.stats.uniqueCountries')}</h3>
                    <p className="stat-value">{data.unique_countries || 0}</p>
                </div>

                <div className="stat-card">
                    <h3>{t('dashboard.stats.uniqueCities')}</h3>
                    <p className="stat-value">{data.unique_cities || 0}</p>
                </div>

                <div className="stat-card full-width">
                    <h3>{t('dashboard.stats.topCountries')}</h3>
                    <ul className="top-list">
                        {data.top_countries?.slice(0, 5).map((item, index) => (
                            <li key={index}>
                                <span className="country-name">{item.country}</span>
                                <span className="country-count">{item.count}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </FloatingWindow>
    );
});

StatsWindow.displayName = 'StatsWindow';

export default StatsWindow;