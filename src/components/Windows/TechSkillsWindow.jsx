import FloatingWindow from './FloatingWindow';

const TechSkillsWindow = ({ data, initialPosition }) => {
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
            title="Tech Skills"
            initialPosition={initialPosition}
            initialSize={{ width: 450, height: 500 }}
        >
            <div className="tech-skills-content">
                {renderSkillCategory('FRONTEND', data.techSkills.frontend)}
                {renderSkillCategory('BACKEND', data.techSkills.backend)}
                {renderSkillCategory('DATABASES', data.techSkills.databases)}
                {renderSkillCategory('OTHERS', data.techSkills.others)}
            </div>
        </FloatingWindow>
    );
};

export default TechSkillsWindow;