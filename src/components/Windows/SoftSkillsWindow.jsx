import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import Tooltip from '../UI/Tooltip';

// Index-based icons — matches softSkills[] order in portfolio-data
const SKILL_ICONS = [
    '🎯', '🧠', '⚖️', '💡', '🤝', '📚', '👥',
    '🚀', '🧘', '🔄', '🔧', '💬', '⭐',
];

// i18n keys for tooltip descriptions — matches softSkills[] order
const DESC_KEYS = [
    'softSkills.desc0', 'softSkills.desc1', 'softSkills.desc2',
    'softSkills.desc3', 'softSkills.desc4', 'softSkills.desc5',
    'softSkills.desc6', 'softSkills.desc7', 'softSkills.desc8',
    'softSkills.desc9', 'softSkills.desc10', 'softSkills.desc11',
    'softSkills.desc12',
];

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
                    {data.softSkills.map((skill, index) => (
                        <Tooltip key={index} text={t(DESC_KEYS[index] || 'softSkills.desc0')} position="top">
                            <div className="soft-skill-card">
                                <span className="soft-skill-icon">
                                    {SKILL_ICONS[index] || '✦'}
                                </span>
                                <span className="soft-skill-name">{skill}</span>
                            </div>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default SoftSkillsWindow;
