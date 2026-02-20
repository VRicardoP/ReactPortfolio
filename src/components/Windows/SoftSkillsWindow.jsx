import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import Tooltip from '../UI/Tooltip';

const SKILL_ICONS = {
    'Committed & Responsible': '🎯',
    'Critical & Analytical Thinking': '🧠',
    'Professional Integrity': '⚖️',
    'Empathy & User Orientation': '💡',
    'Constructive Conflict Resolution': '🤝',
    'Continuous Learning': '📚',
    'Effective Teamwork': '👥',
    'Initiative & Proactivity': '🚀',
    'Stress Management': '🧘',
    'Adaptability': '🔄',
    'Complex Problem-Solving': '🔧',
    'Clear Communication': '💬',
    'Self-Motivation & Self-Management': '⭐',
};

const SKILL_DESCRIPTIONS = {
    'Committed & Responsible': 'Delivers on promises and takes ownership of outcomes',
    'Critical & Analytical Thinking': 'Evaluates complex situations with logic and data-driven reasoning',
    'Professional Integrity': 'Maintains ethical standards and transparency in all interactions',
    'Empathy & User Orientation': 'Understands user needs and designs solutions with their perspective in mind',
    'Constructive Conflict Resolution': 'Navigates disagreements to find win-win outcomes',
    'Continuous Learning': 'Proactively acquires new skills and stays current with industry trends',
    'Effective Teamwork': 'Collaborates across roles and contributes to shared goals',
    'Initiative & Proactivity': 'Identifies opportunities and acts without waiting to be asked',
    'Stress Management': 'Maintains composure and productivity under pressure',
    'Adaptability': 'Thrives in changing environments and pivots quickly when needed',
    'Complex Problem-Solving': 'Breaks down difficult challenges into actionable solutions',
    'Clear Communication': 'Conveys ideas effectively to both technical and non-technical audiences',
    'Self-Motivation & Self-Management': 'Sets goals independently and maintains focus without external supervision',
};

const SoftSkillsWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="soft-skills-window"
            title={t('windows.softSkills')}
            initialPosition={initialPosition}
            initialSize={{ width: 480, height: 420 }}
        >
            <div className="soft-skills-content">
                <div className="soft-skills-grid">
                    {data.softSkills.map((skill, index) => (
                        <Tooltip key={index} text={SKILL_DESCRIPTIONS[skill]} position="top">
                            <div className="soft-skill-card">
                                <span className="soft-skill-icon">
                                    {SKILL_ICONS[skill] || '✦'}
                                </span>
                                <span className="soft-skill-name">{skill}</span>
                            </div>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default SoftSkillsWindow;
