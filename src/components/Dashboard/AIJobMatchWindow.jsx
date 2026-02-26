import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';
import useJobApplication from '../../hooks/useJobApplication';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';

const FIT_COLORS = {
    excellent: { bg: 'rgba(0, 255, 100, 0.15)', text: '#00ff64', border: 'rgba(0, 255, 100, 0.3)' },
    good: { bg: 'rgba(0, 200, 255, 0.15)', text: '#00c8ff', border: 'rgba(0, 200, 255, 0.3)' },
    partial: { bg: 'rgba(255, 200, 0, 0.15)', text: '#ffc800', border: 'rgba(255, 200, 0, 0.3)' },
    poor: { bg: 'rgba(255, 100, 100, 0.15)', text: '#ff8888', border: 'rgba(255, 100, 100, 0.2)' },
    unknown: { bg: 'rgba(150, 150, 150, 0.15)', text: '#999', border: 'rgba(150, 150, 150, 0.2)' },
};

const PAGE_SIZE = 10;

const AIJobMatchWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const { theme } = useTheme();

    const [results, setResults] = useState([]);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [expandedId, setExpandedId] = useState(null);
    const { handleApply, appliedIds } = useJobApplication();

    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/analyze?top_k=50&rerank_top=30&batch_size=10`
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setResults(data.results || []);
            setMetadata(data.metadata || null);
            setPage(0);
        } catch (err) {
            setError(err.message || 'Analysis failed');
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch]);

    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const pagedResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const btnStyle = {
        background: `rgba(${theme.primaryRgb}, 0.2)`,
        border: `1px solid ${theme.primary}`,
        color: theme.primary,
        padding: '2px 8px',
        borderRadius: '3px',
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        cursor: 'pointer',
    };

    return (
        <FloatingWindow
            id="ai-match-window"
            title={t('dashboard.aiMatch.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 700, height: 600 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '8px' }}>
                {/* Header: analyze button + metadata */}
                <div className="ai-match-header">
                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="ai-match-analyze-btn"
                        style={{ backgroundColor: theme.primary }}
                    >
                        {loading ? t('dashboard.aiMatch.analyzing') : t('dashboard.aiMatch.runAnalysis')}
                    </button>
                    {metadata && !loading && (
                        <span className="ai-match-meta">
                            {t('dashboard.aiMatch.analyzed', {
                                total: metadata.total_jobs_analyzed,
                                time: (metadata.total_time_ms / 1000).toFixed(1)
                            })}
                        </span>
                    )}
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="ai-match-loading">
                        <div style={{
                            width: '24px', height: '24px',
                            border: `2px solid ${theme.primary}`,
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <span>{t('dashboard.aiMatch.analyzing')}</span>
                        <span style={{ fontSize: '10px', opacity: 0.6 }}>
                            {t('dashboard.aiMatch.stageInfo')}
                        </span>
                    </div>
                )}

                {error && <div className="ai-match-error">{error}</div>}

                {/* No results placeholder */}
                {!loading && !error && results.length === 0 && (
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Courier New', fontSize: '12px', color: theme.text, opacity: 0.5,
                        textAlign: 'center', padding: '20px',
                    }}>
                        {t('dashboard.aiMatch.noResults')}
                    </div>
                )}

                {/* Results list */}
                {results.length > 0 && (
                    <>
                        {/* Pagination header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontFamily: 'Courier New', fontSize: '11px', color: theme.text, opacity: 0.7,
                        }}>
                            <span>{results.length} {t('dashboard.jobFilter.resultsFound')}</span>
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={btnStyle}>&lt;</button>
                                    <span>{page + 1}/{totalPages}</span>
                                    <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={btnStyle}>&gt;</button>
                                </div>
                            )}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {pagedResults.map((job, idx) => {
                                const fitStyle = FIT_COLORS[job.fit] || FIT_COLORS.unknown;
                                const globalIdx = page * PAGE_SIZE + idx;
                                const isExpanded = expandedId === globalIdx;

                                return (
                                    <div key={`${job.source}-${job.id}-${globalIdx}`} style={{
                                        padding: '8px 10px',
                                        border: `1px solid ${theme.borderLight}`,
                                        borderRadius: '4px',
                                        background: 'rgba(255,255,255,0.02)',
                                    }}>
                                        {/* Header: title + score + fit badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontFamily: 'Courier New', fontSize: '13px',
                                                    color: theme.textHighlight, fontWeight: 'bold',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {job.title}
                                                </div>
                                                <div style={{ fontFamily: 'Courier New', fontSize: '11px', color: theme.text, marginTop: '2px' }}>
                                                    <CompanyResearchName company={job.company}>{job.company}</CompanyResearchName>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                                <span className="ai-match-score" style={{ color: theme.primary }}>
                                                    {job.ai_score}%
                                                </span>
                                                <span className="ai-match-fit-badge" style={{
                                                    background: fitStyle.bg,
                                                    color: fitStyle.text,
                                                    border: `1px solid ${fitStyle.border}`,
                                                }}>
                                                    {job.fit?.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Meta: location, remote, source */}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {job.location && (
                                                <span style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.7 }}>
                                                    {job.location}
                                                </span>
                                            )}
                                            {job.remote && (
                                                <span className="jobboard-remote-badge">REMOTE</span>
                                            )}
                                            <span className="jobboard-source-badge" style={{
                                                backgroundColor: 'rgba(255,255,255,0.08)',
                                                color: theme.primary,
                                                borderColor: `rgba(${theme.primaryRgb}, 0.3)`,
                                            }}>
                                                {job.source}
                                            </span>
                                            {job.employment_type && (
                                                <span style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.5 }}>
                                                    {job.employment_type}
                                                </span>
                                            )}
                                        </div>

                                        {/* Skills analysis toggle */}
                                        <div
                                            className="ai-match-skills-toggle"
                                            style={{ color: theme.primary }}
                                            onClick={() => setExpandedId(isExpanded ? null : globalIdx)}
                                        >
                                            {t('dashboard.aiMatch.skillsAnalysis')} {isExpanded ? '▲' : '▼'}
                                        </div>

                                        {isExpanded && (
                                            <div className="ai-match-skills-detail">
                                                {/* Matching skills (green) */}
                                                {job.matching_skills?.length > 0 && (
                                                    <div style={{ marginBottom: '6px' }}>
                                                        <span className="ai-match-skills-label" style={{ color: '#00ff64' }}>
                                                            ✓ {t('dashboard.aiMatch.matchingSkills')}:
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                                                            {job.matching_skills.map(s => (
                                                                <span key={s} className="jobboard-skill-tag" style={{
                                                                    background: 'rgba(0, 255, 100, 0.1)',
                                                                    borderColor: 'rgba(0, 255, 100, 0.3)',
                                                                    color: '#00ff64',
                                                                }}>{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Missing skills (red) */}
                                                {job.missing_skills?.length > 0 && (
                                                    <div style={{ marginBottom: '6px' }}>
                                                        <span className="ai-match-skills-label" style={{ color: '#ff6b6b' }}>
                                                            ✗ {t('dashboard.aiMatch.missingSkills')}:
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                                                            {job.missing_skills.map(s => (
                                                                <span key={s} className="jobboard-skill-tag" style={{
                                                                    background: 'rgba(255, 100, 100, 0.1)',
                                                                    borderColor: 'rgba(255, 100, 100, 0.3)',
                                                                    color: '#ff6b6b',
                                                                }}>{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Reason */}
                                                {job.reason && (
                                                    <p className="ai-match-reason">{job.reason}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer: date + apply button */}
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            marginTop: '6px',
                                        }}>
                                            <span style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.5 }}>
                                                {job.date ? new Date(job.date).toLocaleDateString() : ''}
                                                <FreshnessBadge dateStr={job.date} />
                                            </span>
                                            {job.url && (
                                                <button
                                                    onClick={() => handleApply(job)}
                                                    className={`jobboard-apply-btn ${appliedIds.has(job.id) ? 'applied' : ''}`}
                                                >
                                                    {appliedIds.has(job.id)
                                                        ? t('dashboard.jobBoard.applied')
                                                        : t('dashboard.jobBoard.apply')
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </FloatingWindow>
    );
});

AIJobMatchWindow.displayName = 'AIJobMatchWindow';

export default AIJobMatchWindow;
