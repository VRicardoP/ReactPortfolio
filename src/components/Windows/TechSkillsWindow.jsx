import { useRef, useEffect, useState, useMemo, memo } from 'react';
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

const TABS = ['bars', 'radar', 'matrix'];

const LEVEL_COLORS = {
    high: '#00ff64',
    medium: '#ffc800',
    low: '#ff9800',
    minimal: '#ff4444',
};

const CATEGORY_COLORS = {
    frontend: '#61dafb',
    backend: '#68d391',
    databases: '#f6ad55',
    others: '#b794f4',
};

const getLevelColor = (level) => {
    if (level >= 75) return LEVEL_COLORS.high;
    if (level >= 60) return LEVEL_COLORS.medium;
    if (level >= 40) return LEVEL_COLORS.low;
    return LEVEL_COLORS.minimal;
};

// --- Bars tab ---
const BarsView = memo(({ data, animated, t }) => {
    const renderCategory = (title, skills) => (
        <div className="skill-category" key={title}>
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
        <>
            {renderCategory(t('skills.frontend'), data.techSkills.frontend)}
            {renderCategory(t('skills.backend'), data.techSkills.backend)}
            {renderCategory(t('skills.databases'), data.techSkills.databases)}
            {renderCategory(t('skills.others'), data.techSkills.others)}
        </>
    );
});
BarsView.displayName = 'BarsView';

// --- Radar tab ---
const RadarView = memo(({ data, theme, t }) => {
    const radarData = useMemo(() => {
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

    return (
        <div className="tech-skills-radar-container">
            <Radar data={radarData} options={radarOptions} />
        </div>
    );
});
RadarView.displayName = 'RadarView';

// --- Matrix tab ---
const MatrixView = memo(({ data, t }) => {
    const allSkills = useMemo(() => {
        const skills = [];
        for (const [category, items] of Object.entries(data.techSkills)) {
            for (const skill of items) {
                skills.push({ name: skill.name, level: skill.level, category });
            }
        }
        skills.sort((a, b) => b.level - a.level);
        return skills;
    }, [data]);

    return (
        <div className="fit-matrix-container">
            <table className="fit-matrix-table">
                <thead>
                    <tr className="fit-matrix-header-row">
                        <th className="fit-matrix-th">{t('fitMatrix.skill')}</th>
                        <th className="fit-matrix-th">{t('fitMatrix.category')}</th>
                        <th className="fit-matrix-th">{t('fitMatrix.proficiency')}</th>
                        <th className="fit-matrix-th fit-matrix-th--right">{t('fitMatrix.level')}</th>
                    </tr>
                </thead>
                <tbody>
                    {allSkills.map((skill) => (
                        <tr key={`${skill.category}-${skill.name}`} className="fit-matrix-row">
                            <td className="fit-matrix-name" title={skill.name}>
                                {skill.name}
                            </td>
                            <td className="fit-matrix-category-cell">
                                <span
                                    className="fit-matrix-badge"
                                    style={{
                                        backgroundColor: `${CATEGORY_COLORS[skill.category] || '#888'}22`,
                                        color: CATEGORY_COLORS[skill.category] || '#888',
                                        borderColor: `${CATEGORY_COLORS[skill.category] || '#888'}44`,
                                    }}
                                >
                                    {skill.category}
                                </span>
                            </td>
                            <td className="fit-matrix-bar-cell">
                                <div className="fit-matrix-bar-bg">
                                    <div
                                        className="fit-matrix-bar-fill"
                                        style={{
                                            width: `${skill.level}%`,
                                            backgroundColor: getLevelColor(skill.level),
                                            boxShadow: `0 0 6px ${getLevelColor(skill.level)}66`,
                                        }}
                                    />
                                </div>
                            </td>
                            <td
                                className="fit-matrix-level"
                                style={{ color: getLevelColor(skill.level) }}
                            >
                                {skill.level}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
MatrixView.displayName = 'MatrixView';

// --- Main component ---
const TechSkillsWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [animated, setAnimated] = useState(false);
    const [activeTab, setActiveTab] = useState('bars');
    const contentRef = useRef(null);

    // Trigger bar animation shortly after mount
    useEffect(() => {
        const timer = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    if (!data?.techSkills) return null;

    const TAB_LABELS = {
        bars: t('skills.viewBars'),
        radar: t('skills.viewRadar'),
        matrix: t('skills.viewMatrix'),
    };

    return (
        <FloatingWindow
            id="tech-skills-window"
            title={t('windows.techSkills')}
            initialPosition={initialPosition}
            initialSize={{ width: 500, height: 520 }}
        >
            <div className="tech-skills-content" ref={contentRef}>
                <div className="tech-skills-toggle">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            className={`toggle-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>

                {activeTab === 'bars' && (
                    <BarsView data={data} animated={animated} t={t} />
                )}
                {activeTab === 'radar' && (
                    <RadarView data={data} theme={theme} t={t} />
                )}
                {activeTab === 'matrix' && (
                    <MatrixView data={data} t={t} />
                )}
            </div>
        </FloatingWindow>
    );
});

TechSkillsWindow.displayName = 'TechSkillsWindow';

export default TechSkillsWindow;
