import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const DEFAULT_ICON = '💡';

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
                        const icon = typeof skill === 'string' ? DEFAULT_ICON : (skill.icon || DEFAULT_ICON);

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
