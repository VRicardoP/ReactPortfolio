/* eslint-disable react-refresh/only-export-components */
import { memo, useState, useCallback, useRef, useEffect } from 'react';

/**
 * Calculate job freshness based on date string.
 * Returns 'new' (<24h), 'recent' (<3d), or 'old' (>3d)
 */
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

const FRESHNESS_LABELS = {
    new: 'NEW',
    recent: 'Recent',
    old: '',
};

/**
 * Freshness badge component for job cards.
 */
export const FreshnessBadge = memo(({ dateStr }) => {
    const freshness = getJobFreshness(dateStr);
    if (!freshness || freshness === 'old') return null;

    return (
        <span className={`freshness-badge freshness-${freshness}`}>
            {FRESHNESS_LABELS[freshness]}
        </span>
    );
});

FreshnessBadge.displayName = 'FreshnessBadge';

/**
 * Company name with clickable research links.
 */
export const CompanyResearchName = memo(({ company, children }) => {
    const [showPanel, setShowPanel] = useState(false);
    const panelRef = useRef(null);

    const slug = company
        ? company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : '';

    const encoded = company ? encodeURIComponent(company) : '';

    // Close panel on outside click
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
