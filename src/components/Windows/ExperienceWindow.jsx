import FloatingWindow from './FloatingWindow';

const ExperienceWindow = ({ data, initialPosition }) => {
    if (!data) return null;

    return (
        <FloatingWindow
            id="experience-window"
            title="Experience"
            initialPosition={initialPosition}
            initialSize={{ width: 600, height: 500 }}
        >
            <div className="experience-content">
                <div className="experience-grid">
                    {data.experience.map((exp, index) => (
                        <div key={index} className="experience-item">
                            <div className="experience-title">{exp.title}</div>
                            <div className="experience-company">{exp.company}</div>
                            {exp.location && (
                                <div className="experience-location">{exp.location}</div>
                            )}
                            <div className="experience-date">{exp.date}</div>
                            <div className="experience-description">{exp.description}</div>
                        </div>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default ExperienceWindow;