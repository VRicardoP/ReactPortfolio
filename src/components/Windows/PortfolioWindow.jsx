// Ventana del portfolio que muestra la lista de proyectos: título, estado,
// tecnologías usadas, descripción, y enlaces al repositorio o a la demo.

import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import { WINDOW_SIZES } from '../../config/windowSizes';

// Traduce el estado interno de un proyecto ("completed", "in-progress") a
// la clave de texto que hay que mostrar.
const STATUS_LABEL_KEYS = {
    'completed': 'portfolio.statusCompleted',
    'in-progress': 'portfolio.statusInProgress',
};

const PortfolioWindow = ({ data, initialPosition, defaultExpanded }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="portfolio-window"
            title={t('windows.portfolio')}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.portfolio}
            defaultExpanded={defaultExpanded}
        >
            <div className="portfolio-content">
                <div className="portfolio-grid">
                    {data.portfolio.map((project, index) => (
                        <div key={index} className="portfolio-item">
                            <div className="portfolio-card-header">
                                <div className="portfolio-title">{project.title}</div>
                                {project.status && (
                                    <span className={`portfolio-status-badge status-${project.status}`}>
                                        {t(STATUS_LABEL_KEYS[project.status]) || project.status}
                                    </span>
                                )}
                            </div>

                            <div className="portfolio-tech-pills">
                                {Array.isArray(project.tech)
                                    ? project.tech.map((t) => (
                                        <span key={t} className="portfolio-tech-pill">{t}</span>
                                    ))
                                    : <span className="portfolio-tech">{project.tech}</span>
                                }
                            </div>

                            <div className="portfolio-description">{project.description}</div>

                            {(project.gitlab || project.github || project.demo) && (
                                <div className="portfolio-links">
                                    {(project.gitlab || project.github) && (
                                        <a href={project.gitlab || project.github} target="_blank" rel="noopener noreferrer"
                                            className="portfolio-link">[Repo]</a>
                                    )}
                                    {project.demo && (
                                        <a href={project.demo} target="_blank" rel="noopener noreferrer"
                                            className="portfolio-link">[Demo]</a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default PortfolioWindow;
