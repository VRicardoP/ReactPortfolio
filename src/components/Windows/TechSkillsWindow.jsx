import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const TechSkillsWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data) return null;

    const renderSkillCategory = (title, skills) => (
        <div className="skill-category">
            <h3 className="category-title">{title}</h3>
            {skills.map((skill, index) => (
                <div key={index} className="skill-item">
                    <div className="skill-name">{skill.name}</div>
                    <div className="skill-bar">
                        <div
                            className="skill-level"
                            style={{ width: `${skill.level}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <FloatingWindow
            id="tech-skills-window"
            title={t('windows.techSkills')}
            initialPosition={initialPosition}
            initialSize={{ width: 450, height: 500 }}
        >
            <div className="tech-skills-content">
                {renderSkillCategory(t('skills.frontend'), data.techSkills.frontend)}
                {renderSkillCategory(t('skills.backend'), data.techSkills.backend)}
                {renderSkillCategory(t('skills.databases'), data.techSkills.databases)}
                {renderSkillCategory(t('skills.others'), data.techSkills.others)}
            </div>
        </FloatingWindow>
    );
};

export default TechSkillsWindow;