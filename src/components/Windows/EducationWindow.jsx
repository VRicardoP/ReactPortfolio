import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

// detect education type for badge styling
const getEducationType = (title, institution) => {
    const text = `${title} ${institution}`.toLowerCase();
    if (text.includes('bootcamp') || text.includes('full stack')) return 'bootcamp';
    if (text.includes('certificate') || text.includes('certificat') || text.includes('cisco') || text.includes('ccna')) return 'cert';
    if (text.includes('technician') || text.includes('degree') || text.includes('bachelor') || text.includes('master') || text.includes('eso') || text.includes('eqf')) return 'degree';
    return 'course';
};

const TYPE_LABELS = {
    degree: 'Degree',
    bootcamp: 'Bootcamp',
    cert: 'Certificate',
    course: 'Course'
};

const EducationWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    const [expandedIndex, setExpandedIndex] = useState(null);

    const toggleExpand = useCallback((index) => {
        setExpandedIndex(prev => prev === index ? null : index);
    }, []);

    if (!data) return null;

    return (
        <FloatingWindow
            id="education-window"
            title={t('windows.education')}
            initialPosition={initialPosition}
            initialSize={{ width: 500, height: 520 }}
        >
            <div className="education-content">
                <div className="timeline">
                    <div className="timeline-line" />
                    {data.education.map((edu, index) => {
                        const isExpanded = expandedIndex === index;
                        const type = getEducationType(edu.title, edu.institution || '');

                        return (
                            <div
                                key={index}
                                className={`timeline-item${isExpanded ? ' expanded' : ''}`}
                                onClick={() => toggleExpand(index)}
                            >
                                <div className="timeline-dot" />
                                {edu.date && (
                                    <div className="timeline-date">{edu.date}</div>
                                )}
                                <div className="timeline-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span className="timeline-card-title">{edu.title}</span>
                                        <span className={`education-badge education-badge-${type}`}>
                                            {TYPE_LABELS[type]}
                                        </span>
                                    </div>
                                    {edu.institution && (
                                        <div className="timeline-card-company">{edu.institution}</div>
                                    )}
                                    {edu.description && (
                                        <div className={`timeline-card-description${isExpanded ? ' show' : ''}`}>
                                            {edu.description}
                                        </div>
                                    )}
                                    {edu.description && (
                                        <span className="timeline-expand-hint">
                                            {isExpanded ? '[-]' : '[+]'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default EducationWindow;
