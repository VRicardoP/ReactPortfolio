import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import '../../styles/welcome-window.css';

const WelcomeWindow = ({ portfolioData }) => {
    const [isVisible, setIsVisible] = useState(true);
    const { t } = useTranslation();

    const initialPosition = useMemo(() => ({
        x: (window.innerWidth - 750) / 2,
        y: (window.innerHeight - 550) / 2
    }), []);

    if (!isVisible) return null;

    return (
        <FloatingWindow
            id="welcome-window"
            title={`🚀 ${t('welcome.title', { name: portfolioData?.name || 'Portfolio' })}`}
            initialPosition={{ x: Math.max(0, initialPosition.x), y: Math.max(0, initialPosition.y) }}
            initialSize={{ width: 750, height: 550 }}
        >
            <div className="welcome-content">
                <div className="welcome-header">
                    <h2>{t('welcome.greeting', { name: portfolioData?.name })}</h2>
                    <p className="welcome-subtitle">{portfolioData?.title}</p>
                </div>

                <div className="welcome-body">
                    <p><strong>{t('welcome.intro')}</strong></p>
                    <p>{t('welcome.description')}</p>

                    <div className="instructions">
                        <h3>📋 {t('welcome.howToNavigate')}</h3>
                        <ul>
                            <li><span className="icon">🖱️</span> <strong>{t('welcome.drag')}</strong> {t('welcome.dragDesc')}</li>
                            <li><span className="icon">↔️</span> <strong>{t('welcome.resize')}</strong> {t('welcome.resizeDesc')}</li>
                            <li><span className="icon purple-dot"></span> <strong>{t('welcome.minimize')}</strong> {t('welcome.minimizeDesc')}</li>
                            <li><span className="icon yellow-dot"></span> <strong>{t('welcome.maximize')}</strong> {t('welcome.maximizeDesc')}</li>
                        </ul>
                    </div>

                    <div className="welcome-tip">
                        💡 <strong>{t('welcome.tip')}</strong> {t('welcome.tipText')}
                    </div>
                </div>

                <div className="welcome-footer">
                    <button
                        className="close-welcome-btn"
                        onClick={() => setIsVisible(false)}
                    >
                        {t('welcome.gotIt')}
                    </button>
                </div>
            </div>
        </FloatingWindow>
    );
};

export default WelcomeWindow;
