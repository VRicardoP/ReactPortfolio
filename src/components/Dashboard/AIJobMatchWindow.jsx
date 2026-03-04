import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../config/api';
import useJobApplication from '../../hooks/useJobApplication';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';
import { AI_MATCH_PAGE_SIZE } from './dashboardConstants';
import '../../styles/ai-match.css';

const FIT_COLORS = {
    excellent: { bg: 'rgba(0, 255, 100, 0.15)', text: '#00ff64', border: 'rgba(0, 255, 100, 0.3)' },
    good: { bg: 'rgba(0, 200, 255, 0.15)', text: '#00c8ff', border: 'rgba(0, 200, 255, 0.3)' },
    partial: { bg: 'rgba(255, 200, 0, 0.15)', text: '#ffc800', border: 'rgba(255, 200, 0, 0.3)' },
    poor: { bg: 'rgba(255, 100, 100, 0.15)', text: '#ff8888', border: 'rgba(255, 100, 100, 0.2)' },
    unknown: { bg: 'rgba(150, 150, 150, 0.15)', text: '#999', border: 'rgba(150, 150, 150, 0.2)' },
};

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
    const [translatedTitles, setTranslatedTitles] = useState({});
    const [translating, setTranslating] = useState(false);
    const { handleApply, appliedIds, handleSave, savedIds } = useJobApplication();

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

    const totalPages = Math.max(1, Math.ceil(results.length / AI_MATCH_PAGE_SIZE));
    const pagedResults = results.slice(page * AI_MATCH_PAGE_SIZE, (page + 1) * AI_MATCH_PAGE_SIZE);

    const translateTitles = useCallback(async () => {
        const titlesToTranslate = pagedResults
            .map(j => j.title)
            .filter(title => !translatedTitles[title]);
        if (titlesToTranslate.length === 0) return;

        setTranslating(true);
        try {
            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/ai-match/translate-titles`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titles: titlesToTranslate }),
                }
            );
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            setTranslatedTitles(prev => ({ ...prev, ...data.translations }));
        } catch (err) {
            console.warn('Translation failed:', err.message);
        } finally {
            setTranslating(false);
        }
    }, [pagedResults, translatedTitles, authenticatedFetch]);

    return (
        <FloatingWindow
            id="ai-match-window"
            title={t('dashboard.aiMatch.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 700, height: 600 }}
        >
            <div className="ai-match-content">
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
                    {results.length > 0 && !loading && (
                        <button
                            onClick={translateTitles}
                            disabled={translating}
                            className="ai-match-translate-btn"
                            title={t('dashboard.aiMatch.translateTooltip')}
                        >
                            {translating
                                ? t('dashboard.aiMatch.translating')
                                : t('dashboard.aiMatch.translateTitles')}
                        </button>
                    )}
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
                        <div
                            className="ai-match-spinner"
                            style={{ borderColor: theme.primary }}
                        />
                        <span>{t('dashboard.aiMatch.analyzing')}</span>
                        <span className="ai-match-stage-info">
                            {t('dashboard.aiMatch.stageInfo')}
                        </span>
                    </div>
                )}

                {error && <div className="ai-match-error">{error}</div>}

                {/* No results placeholder */}
                {!loading && !error && results.length === 0 && (
                    <div className="ai-match-empty" style={{ color: theme.text }}>
                        {t('dashboard.aiMatch.noResults')}
                    </div>
                )}

                {/* Results list */}
                {results.length > 0 && (
                    <>
                        {/* Pagination header */}
                        <div className="ai-match-pagination" style={{ color: theme.text }}>
                            <span>{results.length} {t('dashboard.jobFilter.resultsFound')}</span>
                            {totalPages > 1 && (
                                <div>
                                    <button
                                        disabled={page === 0}
                                        onClick={() => setPage(p => p - 1)}
                                        className="ai-match-page-btn"
                                        style={{
                                            background: `rgba(${theme.primaryRgb}, 0.2)`,
                                            border: `1px solid ${theme.primary}`,
                                            color: theme.primary,
                                        }}
                                    >&lt;</button>
                                    <span>{page + 1}/{totalPages}</span>
                                    <button
                                        disabled={page >= totalPages - 1}
                                        onClick={() => setPage(p => p + 1)}
                                        className="ai-match-page-btn"
                                        style={{
                                            background: `rgba(${theme.primaryRgb}, 0.2)`,
                                            border: `1px solid ${theme.primary}`,
                                            color: theme.primary,
                                        }}
                                    >&gt;</button>
                                </div>
                            )}
                        </div>

                        <div className="ai-match-results">
                            {pagedResults.map((job, idx) => {
                                const fitStyle = FIT_COLORS[job.fit] || FIT_COLORS.unknown;
                                const globalIdx = page * AI_MATCH_PAGE_SIZE + idx;
                                const isExpanded = expandedId === globalIdx;

                                return (
                                    <div
                                        key={`${job.source}-${job.id}-${globalIdx}`}
                                        className="ai-match-card"
                                        style={{ border: `1px solid ${theme.borderLight}` }}
                                    >
                                        {/* Header: title + score + fit badge */}
                                        <div className="ai-match-card-header">
                                            <div className="ai-match-card-title-col">
                                                <div className="ai-match-card-title" style={{ color: theme.textHighlight }}>
                                                    {translatedTitles[job.title] || job.title}
                                                    {translatedTitles[job.title] && (
                                                        <span
                                                            className="ai-match-translated-badge"
                                                            title={job.title}
                                                        >
                                                            {t('dashboard.aiMatch.translated')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="ai-match-card-company" style={{ color: theme.text }}>
                                                    <CompanyResearchName company={job.company}>{job.company}</CompanyResearchName>
                                                </div>
                                            </div>
                                            <div className="ai-match-card-score-col">
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
                                        <div className="ai-match-card-meta">
                                            {job.location && (
                                                <span className="ai-match-card-meta-text" style={{ color: theme.text }}>
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
                                                <span className="ai-match-card-meta-text secondary" style={{ color: theme.text }}>
                                                    {job.employment_type}
                                                </span>
                                            )}
                                        </div>

                                        {/* Skills analysis toggle */}
                                        <button
                                            className="ai-match-skills-toggle"
                                            style={{ color: theme.primary }}
                                            onClick={() => setExpandedId(isExpanded ? null : globalIdx)}
                                            aria-expanded={isExpanded}
                                        >
                                            {t('dashboard.aiMatch.skillsAnalysis')} {isExpanded ? '▲' : '▼'}
                                        </button>

                                        {isExpanded && (
                                            <div className="ai-match-skills-detail">
                                                {/* Matching skills (green) */}
                                                {job.matching_skills?.length > 0 && (
                                                    <div className="ai-match-skills-group">
                                                        <span className="ai-match-skills-label" style={{ color: '#00ff64' }}>
                                                            ✓ {t('dashboard.aiMatch.matchingSkills')}:
                                                        </span>
                                                        <div className="ai-match-skills-tags">
                                                            {job.matching_skills.map(s => (
                                                                <span key={s} className="ai-match-skill-tag-match">{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Missing skills (red) */}
                                                {job.missing_skills?.length > 0 && (
                                                    <div className="ai-match-skills-group">
                                                        <span className="ai-match-skills-label" style={{ color: '#ff6b6b' }}>
                                                            ✗ {t('dashboard.aiMatch.missingSkills')}:
                                                        </span>
                                                        <div className="ai-match-skills-tags">
                                                            {job.missing_skills.map(s => (
                                                                <span key={s} className="ai-match-skill-tag-miss">{s}</span>
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

                                        {/* Footer: date + save/apply buttons */}
                                        <div className="ai-match-card-footer">
                                            <span className="ai-match-card-date" style={{ color: theme.text }}>
                                                {job.date ? new Date(job.date).toLocaleDateString() : ''}
                                                <FreshnessBadge dateStr={job.date} />
                                            </span>
                                            <div className="ai-match-card-actions">
                                                <button
                                                    onClick={() => handleSave(job)}
                                                    disabled={savedIds.has(job.id)}
                                                    className={`cv-gen-btn ${savedIds.has(job.id) ? 'cv-gen-btn-applied' : 'cv-gen-btn-generate'}`}
                                                >
                                                    {savedIds.has(job.id)
                                                        ? t('dashboard.aiMatch.saved')
                                                        : t('dashboard.aiMatch.saveToBoard')
                                                    }
                                                </button>
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
