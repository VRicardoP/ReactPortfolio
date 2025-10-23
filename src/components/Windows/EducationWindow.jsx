import FloatingWindow from './FloatingWindow';

const EducationWindow = ({ data, initialPosition }) => {
    if (!data) return null;

    return (
        <FloatingWindow
            id="education-window"
            title="Education"
            initialPosition={initialPosition}
            initialSize={{ width: 450, height: 500 }}
        >
            <div className="education-content">
                {data.education.map((edu, index) => (
                    <div key={index} className="education-item">
                        <div className="education-title">{edu.title}</div>
                        {edu.institution && (
                            <div className="education-institution">{edu.institution}</div>
                        )}
                        {edu.date && (
                            <div className="education-date">{edu.date}</div>
                        )}
                        {edu.description && (
                            <div className="education-description">{edu.description}</div>
                        )}
                    </div>
                ))}
            </div>
        </FloatingWindow>
    );
};

export default EducationWindow;