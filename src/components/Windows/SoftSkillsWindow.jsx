import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const SoftSkillsWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="soft-skills-window"
            title={t('windows.softSkills')}
            initialPosition={initialPosition}
            initialSize={{ width: 400, height: 300 }}
        >
            <div className="soft-skills-content">
                <p className="skills-description">
                    {data.softSkills.join(', ')}
                </p>
            </div>
        </FloatingWindow>
    );
};

export default SoftSkillsWindow;