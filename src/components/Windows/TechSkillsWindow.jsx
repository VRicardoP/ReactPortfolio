import { useRef, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip as ChartTooltip,
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import FloatingWindow from './FloatingWindow';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip);

const TechSkillsWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [animated, setAnimated] = useState(false);
    const [viewMode, setViewMode] = useState('bars');
    const contentRef = useRef(null);

    // Trigger bar animation when visible
    useEffect(() => {
        if (!contentRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setAnimated(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    // Radar chart data
    const radarData = useMemo(() => {
        if (!data?.techSkills) return null;
        const categories = [
            { key: 'frontend', label: t('skills.frontend') },
            { key: 'backend', label: t('skills.backend') },
            { key: 'databases', label: t('skills.databases') },
            { key: 'others', label: t('skills.others') },
        ];
        const averages = categories.map(({ key }) => {
            const skills = data.techSkills[key];
            return Math.round(skills.reduce((sum, s) => sum + s.level, 0) / skills.length);
        });
        return {
            labels: categories.map(c => c.label),
            datasets: [{
                data: averages,
                backgroundColor: `rgba(${theme.primaryRgb}, 0.2)`,
                borderColor: theme.primary,
                borderWidth: 2,
                pointBackgroundColor: theme.primary,
                pointBorderColor: theme.primary,
                pointRadius: 4,
            }],
        };
    }, [data, theme, t]);

    const radarOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)' } },
        scales: {
            r: {
                min: 0,
                max: 100,
                ticks: { stepSize: 20, color: theme.text, backdropColor: 'transparent', font: { family: 'Courier New', size: 10 } },
                grid: { color: `rgba(${theme.primaryRgb}, 0.15)` },
                angleLines: { color: `rgba(${theme.primaryRgb}, 0.2)` },
                pointLabels: { color: theme.text, font: { family: 'Courier New', size: 12, weight: 'bold' } },
            },
        },
    }), [theme]);

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
                            style={{
                                width: animated ? `${skill.level}%` : '0%',
                                transitionDelay: `${index * 80}ms`,
                            }}
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
            initialSize={{ width: 450, height: 520 }}
        >
            <div className="tech-skills-content" ref={contentRef}>
                <div className="tech-skills-toggle">
                    <button
                        className={`toggle-btn ${viewMode === 'bars' ? 'active' : ''}`}
                        onClick={() => setViewMode('bars')}
                    >
                        {t('skills.viewBars')}
                    </button>
                    <button
                        className={`toggle-btn ${viewMode === 'radar' ? 'active' : ''}`}
                        onClick={() => setViewMode('radar')}
                    >
                        {t('skills.viewRadar')}
                    </button>
                </div>

                {viewMode === 'bars' ? (
                    <>
                        {renderSkillCategory(t('skills.frontend'), data.techSkills.frontend)}
                        {renderSkillCategory(t('skills.backend'), data.techSkills.backend)}
                        {renderSkillCategory(t('skills.databases'), data.techSkills.databases)}
                        {renderSkillCategory(t('skills.others'), data.techSkills.others)}
                    </>
                ) : (
                    <div className="tech-skills-radar-container">
                        {radarData && <Radar data={radarData} options={radarOptions} />}
                    </div>
                )}
            </div>
        </FloatingWindow>
    );
};

export default TechSkillsWindow;
