import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const LEGACY_ICON_LABELS = {
    '\u{1F3AF}': 'AIM',
    '\u{1F680}': 'GO',
    '\u{1F4AC}': 'COM',
    '\u{1F527}': 'FIX',
    '\u{1F4DD}': 'DOC',
    '\u{1F4DA}': 'EDU',
    '\u2B50': 'OWN',
    '\u{1F3E0}': 'REM',
    '\u{1F9D8}': 'CALM',
};

const iconLabel = (icon) => {
    if (LEGACY_ICON_LABELS[icon]) return LEGACY_ICON_LABELS[icon];
    return /^[A-Z0-9]{1,5}$/.test(icon || '') ? icon : 'SKL';
};

const SoftSkillsWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="soft-skills-window"
            title={t('windows.softSkills')}
            initialPosition={initialPosition}
            initialSize={{ width: 480, height: 420 }}
        >
            <div className="soft-skills-content">
                <div className="soft-skills-grid">
                    {data.softSkills.map((skill, index) => {
                        const text = typeof skill === 'string' ? skill : skill.text;
                        const icon = typeof skill === 'string' ? 'SKL' : iconLabel(skill.icon);

                        return (
                            <div className="soft-skill-card" key={`${text}-${index}`}>
                                <span className="soft-skill-icon" aria-hidden="true">{icon}</span>
                                <span className="soft-skill-name">{text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default SoftSkillsWindow;
