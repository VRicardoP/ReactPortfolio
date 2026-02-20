import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const ExperienceWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    const [expandedIndex, setExpandedIndex] = useState(null);

    const toggleExpand = useCallback((index) => {
        setExpandedIndex(prev => prev === index ? null : index);
    }, []);

    if (!data) return null;

    // Extract year range for career span bar
    const dates = data.experience.map(exp => {
        const match = exp.date.match(/\d{4}/g);
        return match ? match.map(Number) : [];
    }).flat();
    const startYear = Math.min(...dates);
    const endYear = Math.max(...dates);

    return (
        <FloatingWindow
            id="experience-window"
            title={t('windows.experience')}
            initialPosition={initialPosition}
            initialSize={{ width: 600, height: 550 }}
        >
            <div className="experience-content">
                {/* Career span bar */}
                <div className="career-span-bar">
                    <span className="career-span-label">{startYear}</span>
                    <div className="career-span-track">
                        <div className="career-span-fill" />
                    </div>
                    <span className="career-span-label">{endYear}</span>
                </div>

                {/* Timeline */}
                <div className="timeline">
                    <div className="timeline-line" />
                    {data.experience.map((exp, index) => {
                        const isExpanded = expandedIndex === index;
                        return (
                            <div
                                key={index}
                                className={`timeline-item ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleExpand(index)}
                            >
                                <div className="timeline-dot" />
                                <div className="timeline-date">{exp.date}</div>
                                <div className="timeline-card">
                                    <div className="timeline-card-title">{exp.title}</div>
                                    <div className="timeline-card-company">{exp.company}</div>
                                    {exp.location && (
                                        <div className="timeline-card-location">{exp.location}</div>
                                    )}
                                    <div className={`timeline-card-description ${isExpanded ? 'show' : ''}`}>
                                        {exp.description}
                                    </div>
                                    <span className="timeline-expand-hint">
                                        {isExpanded ? '[-]' : '[+]'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default ExperienceWindow;