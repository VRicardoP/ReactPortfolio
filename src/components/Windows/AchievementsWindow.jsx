// Ventana del portfolio que muestra los logros destacados (como tarjetas
// con un icono, un número y su descripción).

import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import { WINDOW_SIZES } from '../../config/windowSizes';

const AchievementsWindow = ({ data, initialPosition, defaultExpanded }) => {
    const { t } = useTranslation();
    if (!data?.achievements) return null;

    return (
        <FloatingWindow
            id="achievements-window"
            title={t('windows.achievements')}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.achievements}
            defaultExpanded={defaultExpanded}
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
