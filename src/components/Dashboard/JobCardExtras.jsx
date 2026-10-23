/* eslint-disable react-refresh/only-export-components */
// Piezas pequeñas y reutilizables para las tarjetas de oferta de empleo:
// la etiqueta de "nueva/reciente", el resumen, la fecha, los distintivos
// (remoto, fuente, tipo de contrato), y el nombre de la empresa con un
// menú de enlaces para investigarla (LinkedIn, Glassdoor, Crunchbase).

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Calculate job freshness based on date string.
 * Returns 'new' (<24h), 'recent' (<3d), or 'old' (>3d)
 */
// Calcula si una oferta es "nueva" (menos de 24h), "reciente" (menos de 3
// días) o "antigua", a partir de su fecha.
export const getJobFreshness = (dateStr) => {
    if (!dateStr) return null;

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;

        const now = Date.now();
        const diffMs = now - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 24) return 'new';
        if (diffHours < 72) return 'recent';
        return 'old';
    } catch {
        return null;
    }
};

const FRESHNESS_LABEL_KEYS = {
    new: 'dashboard.jobBoard.badges.new',
    recent: 'dashboard.jobBoard.badges.recent',
};

/**
 * Freshness badge component for job cards.
 */
// Muestra la etiqueta "Nueva"/"Reciente" sobre una tarjeta de oferta, o
// nada si la oferta ya es antigua.
export const FreshnessBadge = memo(({ dateStr }) => {
    const { t } = useTranslation();
    const freshness = getJobFreshness(dateStr);
    if (!freshness || freshness === 'old') return null;

    return (
        <span className={`freshness-badge freshness-${freshness}`}>
            {t(FRESHNESS_LABEL_KEYS[freshness])}
        </span>
    );
});

FreshnessBadge.displayName = 'FreshnessBadge';


// Muestra el resumen de una oferta (o la descripción, o un texto por
// defecto si no hay ninguno de los dos).
export const JobSummary = memo(({ job, className = '', style }) => {
    const { t } = useTranslation();
    const summary = job.summary || job.description_snippet;
    const variant = job.summary ? '' : summary ? 'secondary' : 'muted';

    return (
        <p className={[className, variant].filter(Boolean).join(' ')} style={style}>
            {summary || t('dashboard.aiMatch.noDescription')}
        </p>
    );
});

JobSummary.displayName = 'JobSummary';

// Muestra la fecha de la oferta junto con su etiqueta de "nueva/reciente".
export const JobDate = memo(({ date, className = '', style }) => (
    <span className={className} style={style}>
        {date ? new Date(date).toLocaleDateString() : ''}
        <FreshnessBadge dateStr={date} />
    </span>
));

JobDate.displayName = 'JobDate';

// Muestra los distintivos de una oferta: si es remota, de qué fuente
// viene, y el tipo de contrato.
export const JobBadges = memo(({
    remote,
    source,
    employmentType,
    sourceStyle,
    employmentClassName = '',
    employmentStyle,
}) => {
    const { t } = useTranslation();
    return (
    <>
        {remote && <span className="jobboard-remote-badge">{t('dashboard.jobBoard.badges.remote')}</span>}
        {source && (
            <span className="jobboard-source-badge" style={sourceStyle}>
                {source}
            </span>
        )}
        {employmentType && (
            <span className={employmentClassName} style={employmentStyle}>
                {employmentType}
            </span>
        )}
    </>
    );
});

JobBadges.displayName = 'JobBadges';

/**
 * Company name with clickable research links.
 */
// Muestra el nombre de la empresa como un botón que, al pulsarlo, abre un
// pequeño menú con enlaces para buscarla en LinkedIn, Glassdoor y Crunchbase.
export const CompanyResearchName = memo(({ company, children }) => {
    const [showPanel, setShowPanel] = useState(false);
    const panelRef = useRef(null);

    const slug = company
        ? company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : '';

    const encoded = company ? encodeURIComponent(company) : '';

    // Close panel on outside click
    // Cierra el menú si se hace clic fuera de él.
    useEffect(() => {
        if (!showPanel) return;

        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setShowPanel(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPanel]);

    // Abre o cierra el menú de enlaces.
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        setShowPanel(prev => !prev);
    }, []);

    if (!company) return children || null;

    return (
        <span style={{ position: 'relative', display: 'inline-block' }} ref={panelRef}>
            <button
                type="button"
                onClick={handleClick}
                aria-expanded={showPanel}
                aria-haspopup="true"
                className="company-research-btn"
            >
                {children || company}
            </button>
            {showPanel && (
                <div className="company-research-panel">
                    <a
                        href={`https://linkedin.com/company/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="company-research-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        LinkedIn
                    </a>
                    <a
                        href={`https://glassdoor.com/Search/results.htm?keyword=${encoded}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="company-research-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Glassdoor
                    </a>
                    <a
                        href={`https://crunchbase.com/organization/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="company-research-link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Crunchbase
                    </a>
                </div>
            )}
        </span>
    );
});

CompanyResearchName.displayName = 'CompanyResearchName';
