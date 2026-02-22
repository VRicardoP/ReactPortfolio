import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const getLevelColor = (level) => {
    if (level >= 75) return '#00ff64';
    if (level >= 60) return '#ffc800';
    if (level >= 40) return '#ff9800';
    return '#ff4444';
};

const CATEGORY_COLORS = {
    frontend: '#61dafb',
    backend: '#68d391',
    databases: '#f6ad55',
    others: '#b794f4',
};

const styles = {
    container: {
        fontFamily: '"Courier New", Courier, monospace',
        padding: '12px',
        overflowY: 'auto',
        height: '100%',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    headerRow: {
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
    },
    th: {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'rgba(255, 255, 255, 0.5)',
        padding: '4px 8px 8px',
        textAlign: 'left',
        fontWeight: 'normal',
    },
    thRight: {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'rgba(255, 255, 255, 0.5)',
        padding: '4px 8px 8px',
        textAlign: 'right',
        fontWeight: 'normal',
    },
    row: {
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
    nameCell: {
        padding: '6px 8px',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.9)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '170px',
    },
    categoryCell: {
        padding: '6px 8px',
        textAlign: 'center',
    },
    barCell: {
        padding: '6px 8px',
        width: '40%',
    },
    barBackground: {
        width: '100%',
        height: '14px',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: '2px',
        overflow: 'hidden',
    },
    levelCell: {
        padding: '6px 8px',
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
    },
};

const getCategoryBadgeStyle = (category) => ({
    display: 'inline-block',
    fontSize: '10px',
    padding: '1px 6px',
    borderRadius: '3px',
    backgroundColor: `${CATEGORY_COLORS[category] || '#888'}22`,
    color: CATEGORY_COLORS[category] || '#888',
    border: `1px solid ${CATEGORY_COLORS[category] || '#888'}44`,
    fontFamily: '"Courier New", Courier, monospace',
    whiteSpace: 'nowrap',
});

const getBarFillStyle = (level) => ({
    height: '100%',
    width: `${level}%`,
    backgroundColor: getLevelColor(level),
    borderRadius: '2px',
    transition: 'width 0.6s ease-out',
    boxShadow: `0 0 6px ${getLevelColor(level)}66`,
});

const FitMatrixWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();

    // Flatten all skills across categories and sort by level descending
    const allSkills = useMemo(() => {
        if (!data?.techSkills) return [];

        const skills = [];
        for (const [category, items] of Object.entries(data.techSkills)) {
            for (const skill of items) {
                skills.push({
                    name: skill.name,
                    level: skill.level,
                    category,
                });
            }
        }
        skills.sort((a, b) => b.level - a.level);
        return skills;
    }, [data]);

    if (!data?.techSkills) return null;

    return (
        <FloatingWindow
            id="fit-matrix-window"
            title={t('windows.fitMatrix')}
            initialPosition={initialPosition}
            initialSize={{ width: 520, height: 450 }}
        >
            <div style={styles.container}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.headerRow}>
                            <th style={styles.th}>{t('fitMatrix.skill')}</th>
                            <th style={styles.th}>{t('fitMatrix.category')}</th>
                            <th style={styles.th}>{t('fitMatrix.proficiency')}</th>
                            <th style={styles.thRight}>{t('fitMatrix.level')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allSkills.map((skill) => (
                            <tr key={`${skill.category}-${skill.name}`} style={styles.row}>
                                <td style={styles.nameCell} title={skill.name}>
                                    {skill.name}
                                </td>
                                <td style={styles.categoryCell}>
                                    <span style={getCategoryBadgeStyle(skill.category)}>
                                        {skill.category}
                                    </span>
                                </td>
                                <td style={styles.barCell}>
                                    <div style={styles.barBackground}>
                                        <div style={getBarFillStyle(skill.level)} />
                                    </div>
                                </td>
                                <td style={{ ...styles.levelCell, color: getLevelColor(skill.level) }}>
                                    {skill.level}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </FloatingWindow>
    );
});

FitMatrixWindow.displayName = 'FitMatrixWindow';

export default FitMatrixWindow;
