import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import { BACKEND_URL } from '../../config/api';

const QUICK_STATS = [
    { key: 'yearsExp', fallback: '20+ yrs' },
    { key: 'locations', fallback: 'Spain + UK' },
    { key: 'bilingual', fallback: 'Bilingual' },
    { key: 'roles', fallback: '8 roles' },
];

const RECRUITER_HIGHLIGHTS = [
    { label: 'Top Impact', items: ['99%+ network uptime (healthcare)', '60% infra performance boost', 'Zero data loss across mission-critical DCs'] },
    { label: 'Core Stack', items: ['React / FastAPI / PostgreSQL / Docker', 'Cisco / Fortigate / VMware / AWS', 'Python / Java / Node.js / SQL'] },
    { label: 'Key Metrics', items: ['20+ years across 8 roles', '1,000+ terminals managed', '4 countries remote support'] },
];

const ProfileWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    const [recruiterMode, setRecruiterMode] = useState(false);
    const [showCvMenu, setShowCvMenu] = useState(false);

    const handleExportJSON = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/v1/cv/json-resume`);
            const json = await response.json();
            const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'resume.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Silently fail
        }
        setShowCvMenu(false);
    }, []);

    const handleExportPDF = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/v1/cv/html`);
            const html = await response.text();
            const win = window.open('', '_blank');
            win.document.write(html);
            win.document.close();
            setTimeout(() => win.print(), 500);
        } catch {
            // Silently fail
        }
        setShowCvMenu(false);
    }, []);

    if (!data) return null;

    const initials = data.name
        ? data.name.split(' ').filter(w => w[0] === w[0]?.toUpperCase()).slice(0, 2).map(w => w[0]).join('')
        : 'VP';

    return (
        <FloatingWindow
            id="profile-window"
            title={t('windows.profile')}
            initialPosition={initialPosition}
            initialSize={{ width: 480, height: 420 }}
        >
            <div className="profile-content">
                <div className="profile-header">
                    <div className="profile-avatar">{initials}</div>
                    <div className="profile-header-info">
                        <div className="profile-name">{data.name}</div>
                        <div className="profile-title-text">{data.title}</div>
                    </div>
                </div>

                <div className="profile-chips">
                    {QUICK_STATS.map(({ key, fallback }) => (
                        <span key={key} className="profile-chip">
                            {t(`profile.${key}`, fallback)}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        className={`profile-view-toggle ${recruiterMode ? 'active' : ''}`}
                        onClick={() => setRecruiterMode(prev => !prev)}
                    >
                        {recruiterMode ? t('profile.normalView') : t('profile.recruiterView')}
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button
                            className="profile-view-toggle"
                            onClick={() => setShowCvMenu(prev => !prev)}
                        >
                            {t('profile.downloadCV')}
                        </button>
                        {showCvMenu && (
                            <div className="cv-export-menu">
                                <button className="cv-export-option" onClick={handleExportJSON}>
                                    {t('profile.exportJSON')}
                                </button>
                                <button className="cv-export-option" onClick={handleExportPDF}>
                                    {t('profile.exportPDF')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {recruiterMode ? (
                    <div className="recruiter-view">
                        {RECRUITER_HIGHLIGHTS.map(({ label, items }) => (
                            <div key={label} className="recruiter-section">
                                <div className="recruiter-section-title">{label}</div>
                                <ul className="recruiter-list">
                                    {items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="profile-description">{data.profile.description}</p>
                )}
            </div>
        </FloatingWindow>
    );
};

export default ProfileWindow;