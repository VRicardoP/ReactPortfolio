import FloatingWindow from './FloatingWindow';

const SoftSkillsWindow = ({ data, initialPosition }) => {
    if (!data) return null;

    return (
        <FloatingWindow
            id="soft-skills-window"
            title="Soft Skills"
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