import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const AchievementsWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data?.achievements) return null;

    return (
        <FloatingWindow
            id="achievements-window"
            title={t('windows.achievements')}
            initialPosition={initialPosition}
            initialSize={{ width: 520, height: 380 }}
        >
            <div className="achievements-content">
                <div className="achievements-grid">
                    {data.achievements.map((item, index) => (
                        <div key={index} className="achievement-card">
                            <span className="achievement-icon">{item.icon}</span>
                            <div className="achievement-value">{item.value}</div>
                            <div className="achievement-metric">{item.metric}</div>
                        </div>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default AchievementsWindow;
