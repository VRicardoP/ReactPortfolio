import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const PortfolioWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="portfolio-window"
            title={t('windows.portfolio')}
            initialPosition={initialPosition}
            initialSize={{ width: 500, height: 400 }}
        >
            <div className="portfolio-content">
                <div className="portfolio-grid">
                    {data.portfolio.map((project, index) => (
                        <div key={index} className="portfolio-item">
                            <div className="portfolio-title">{project.title}</div>
                            <div className="portfolio-tech">{project.tech}</div>
                            <div className="portfolio-description">{project.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default PortfolioWindow;