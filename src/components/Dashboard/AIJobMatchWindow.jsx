// Ventana de "coincidencia con IA": pide al backend que compare el perfil
// del usuario con todas las ofertas, y muestra los resultados ordenados por
// puntuación, con pestañas de resultados y de "habilidades que faltan".
// Toda la lógica vive en el hook useAIJobMatch (este fichero solo pinta la UI).

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import TabBar from '../UI/TabBar';
import Pager from '../UI/Pager';
import { useTheme } from '../../context/ThemeContext';
import useJobApplication from '../../hooks/useJobApplication';
import useSkillsGap from '../../hooks/useSkillsGap';
import useAIJobMatch, { ALL_MATCH_SOURCES, TAB_RESULTS, TAB_SKILLS_GAP } from '../../hooks/useAIJobMatch';
import JobCard from './JobCard';
import { AI_MATCH_PAGE_SIZE } from './dashboardConstants';
import { SOURCE_COLOR_MAP } from '../../config/jobSources';
import '../../styles/ai-match.css';

// Da el texto que se muestra mientras el análisis corre en el servidor,
// según en qué fase va (comparando ofertas, puntuando con IA, terminando...).
/** i18n label for the current background-analysis stage. */
const stageLabel = (t, progress) => {
    switch (progress?.stage) {
        case 'embedding':
            return t('dashboard.aiMatch.progressEmbedding', {
                done: progress.jobs_done, total: progress.jobs_total,
            });
        case 'rerank':
            return t('dashboard.aiMatch.progressRerank', {
                done: progress.batches_done, total: progress.batches_total,
            });
        case 'finalize':
            return t('dashboard.aiMatch.progressFinalize');
        default:
            return t('dashboard.aiMatch.progressCollect');
    }
};

// Componente principal de la ventana: solo pinta la interfaz, toda la
// lógica (analizar, filtrar, paginar, traducir, marcar habilidades) viene
// de los hooks useAIJobMatch, useJobApplication y useSkillsGap.
const AIJobMatchWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();

    const {
        results,
        metadata,
        dataSource,
        loading,
        progress,
        error,
        runAnalysis,
        page,
        totalPages,
        pagedResults,
        filteredResults = results,
        availableSources = [],
        sourceCounts = {},
        sourceFilter = ALL_MATCH_SOURCES,
        selectSource = () => {},
        remoteOnly = false,
        toggleRemoteOnly = () => {},
        prevPage,
        nextPage,
        expandedId,
        toggleExpanded,
        translatedTitles,
        translating,
        translateTitles,
        activeTab,
        selectTab,
        llmUnavailable,
    } = useAIJobMatch();
    const { handleInterested, interestedIds, handleSave, savedIds, handleOpenOffer, openedIds } =
        useJobApplication();
    const { missingSkills, addedSkills, togglingSkills, toggleSkill, lastError: skillError } = useSkillsGap(results);

    return (
        <FloatingWindow
            id="ai-match-window"
            title={t('dashboard.aiMatch.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 700, height: 600 }}
        >
            <div className="ai-match-content">
                {/* Cabecera: botón para lanzar el análisis, botón de traducir
                    títulos, y un texto con cuántas ofertas se analizaron. */}
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
                    {results.length > 0 && !loading && activeTab === TAB_RESULTS && (
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
                            {dataSource === 'core'
                                ? t('dashboard.aiMatch.coreFeed', { count: results.length })
                                : dataSource === 'composite'
                                    ? t('dashboard.aiMatch.compositeFeed', { count: results.length })
                                    : t('dashboard.aiMatch.analyzed', {
                                        total: metadata.total_jobs_analyzed,
                                        time: (metadata.total_time_ms / 1000).toFixed(1)
                                    })}
                            {metadata.computed_at && (
                                <> · {t('dashboard.aiMatch.computedAt', {
                                    time: new Date(metadata.computed_at).toLocaleString()
                                })}</>
                            )}
                        </span>
                    )}
                </div>

                {dataSource === 'local_fallback' && (
                    <p role="status">{t('dashboard.aiMatch.localFallback')}</p>
                )}

                {/* Pestañas para cambiar entre "Resultados" y "Habilidades que faltan". */}
                {/* Tabs */}
                {results.length > 0 && (
                    <TabBar
                        className="ai-match-tabs"
                        tabClassName="ai-match-tab"
                        ariaLabel={t('dashboard.aiMatch.title')}
                        active={activeTab}
                        onChange={selectTab}
                        tabs={[
                            {
                                key: TAB_RESULTS,
                                label: `${t('dashboard.aiMatch.resultsTab')} (${results.length})`,
                                style: activeTab === TAB_RESULTS
                                    ? { color: theme.primary, borderColor: theme.primary }
                                    : {},
                            },
                            {
                                key: TAB_SKILLS_GAP,
                                label: `${t('dashboard.aiMatch.skillsGapTab')} (${missingSkills.length})`,
                                disabled: llmUnavailable,
                                title: llmUnavailable ? t('dashboard.aiMatch.skillsGapUnavailable') : undefined,
                                style: activeTab === TAB_SKILLS_GAP
                                    ? { color: theme.primary, borderColor: theme.primary }
                                    : {},
                            },
                        ]}
                    />
                )}

                {/* Barra de filtros: pestañas por fuente de empleo (todas/Jobicy/...)
                    y una casilla para ver solo ofertas remotas. */}
                {results.length > 0 && activeTab === TAB_RESULTS && (
                    <div className="ai-match-filter-bar">
                        <TabBar
                            className="ai-match-source-tabs"
                            tabClassName="ai-match-source-tab"
                            ariaLabel={t('dashboard.jobBoard.windowTitle', { defaultValue: 'Job portals' })}
                            active={sourceFilter}
                            onChange={selectSource}
                            tabs={[ALL_MATCH_SOURCES, ...availableSources].map(source => {
                                const color = SOURCE_COLOR_MAP[source] || theme.primary;
                                const labelKey = source === ALL_MATCH_SOURCES
                                    ? 'dashboard.jobBoard.tabAll'
                                    : 'dashboard.jobBoard.tab'
                                        + source.charAt(0).toUpperCase() + source.slice(1);
                                return {
                                    key: source,
                                    color,
                                    style: { color: sourceFilter === source ? color : undefined },
                                    label: (
                                        <>
                                            {t(labelKey, { defaultValue: source })}
                                            <span className="ai-match-source-count">{sourceCounts[source] || 0}</span>
                                        </>
                                    ),
                                };
                            })}
                        />
                        <label className="ai-match-remote-filter">
                            <input
                                type="checkbox"
                                checked={remoteOnly}
                                onChange={toggleRemoteOnly}
                            />
                            <span>{t('dashboard.jobBoard.remote')}</span>
                        </label>
                    </div>
                )}

                {/* Mientras se analiza: barra de progreso real que viene del
                    servidor (no es una animación falsa). */}
                {/* Loading state: real progress of the server-side background run */}
                {loading && (
                    <div className="ai-match-loading">
                        <div className="ai-match-progress-track">
                            <div
                                className="ai-match-progress-fill"
                                style={{
                                    width: `${progress?.percent ?? 0}%`,
                                    backgroundColor: theme.primary,
                                }}
                            />
                        </div>
                        <span className="ai-match-progress-label" style={{ color: theme.textHighlight }}>
                            {progress?.percent ?? 0}% — {stageLabel(t, progress)}
                        </span>
                        <span className="ai-match-stage-info">
                            {t('dashboard.aiMatch.stageInfo')}
                        </span>
                    </div>
                )}

                {error && <div className="ai-match-error">{error}</div>}

                {/* Mensaje cuando todavía no hay ningún resultado que mostrar. */}
                {/* No results placeholder */}
                {!loading && !error && results.length === 0 && (
                    <div className="ai-match-empty" style={{ color: theme.text }}>
                        {t('dashboard.aiMatch.noResults')}
                    </div>
                )}

                {/* Pestaña "Resultados": lista paginada de ofertas con su
                    puntuación de IA, insignia de encaje, y botones para
                    marcar interés, guardar o abrir la oferta. */}
                {/* Results tab */}
                {results.length > 0 && activeTab === TAB_RESULTS && (
                    <>
                        <Pager
                            page={page}
                            totalPages={totalPages}
                            onPageChange={(next) => next < page ? prevPage() : nextPage()}
                            summary={<span>{filteredResults.length} {t('dashboard.jobFilter.resultsFound')}</span>}
                            className="ai-match-pagination"
                            buttonClassName="ai-match-page-btn"
                            style={{ color: theme.text }}
                            buttonStyle={{
                                background: `rgba(${theme.primaryRgb}, 0.2)`,
                                border: `1px solid ${theme.primary}`,
                                color: theme.primary,
                            }}
                        />

                        <div className="ai-match-results">
                            {pagedResults.map((job, idx) => {
                                const globalIdx = page * AI_MATCH_PAGE_SIZE + idx;
                                const isExpanded = expandedId === globalIdx;

                                return (
                                    <JobCard
                                        key={`${job.source}-${job.id}-${globalIdx}`}
                                        job={job}
                                        variant="match"
                                        translatedTitle={translatedTitles[job.title]}
                                        expanded={isExpanded}
                                        onToggle={() => toggleExpanded(globalIdx)}
                                        actions={(
                                            <>
                                                <button
                                                    onClick={() => handleInterested(job)}
                                                    disabled={interestedIds.has(job.id)}
                                                    className={`cv-gen-btn ${interestedIds.has(job.id) ? 'cv-gen-btn-applied' : 'cv-gen-btn-generate'}`}
                                                >
                                                    {interestedIds.has(job.id)
                                                        ? t('dashboard.jobBoard.interestedDone')
                                                        : t('dashboard.jobBoard.interested')}
                                                </button>
                                                <button
                                                    onClick={() => handleSave(job)}
                                                    disabled={savedIds.has(job.id)}
                                                    className={`cv-gen-btn ${savedIds.has(job.id) ? 'cv-gen-btn-applied' : 'cv-gen-btn-generate'}`}
                                                >
                                                    {savedIds.has(job.id)
                                                        ? t('dashboard.aiMatch.saved')
                                                        : t('dashboard.aiMatch.saveToBoard')}
                                                </button>
                                                {job.url && (
                                                    <button
                                                        onClick={() => handleOpenOffer(job)}
                                                        className={`jobboard-apply-btn ${openedIds.has(job.id) ? 'applied' : ''}`}
                                                    >
                                                        {openedIds.has(job.id)
                                                            ? t('dashboard.jobBoard.opened')
                                                            : t('dashboard.jobBoard.viewOffer')}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Pestaña "Habilidades que faltan": lista de habilidades pedidas
                    por las ofertas que el perfil no tiene, con un botón para
                    añadirlas al CV con un clic. */}
                {/* Skills Gap tab */}
                {results.length > 0 && activeTab === TAB_SKILLS_GAP && (
                    <div className="ai-match-skills-gap">
                        <p className="ai-match-skills-gap-desc" style={{ color: theme.text }}>
                            {t('dashboard.aiMatch.skillsGapDesc')}
                        </p>
                        {skillError && (
                            <div className="ai-match-error">{t('dashboard.aiMatch.skillToggleError')}: {skillError}</div>
                        )}
                        {missingSkills.length === 0 ? (
                            <div className="ai-match-empty" style={{ color: theme.text }}>
                                {t('dashboard.aiMatch.skillsGapEmpty')}
                            </div>
                        ) : (
                            <div className="ai-match-skills-gap-list">
                                {missingSkills.map(skill => {
                                    const isAdded = addedSkills.has(skill);
                                    const isToggling = togglingSkills.has(skill);
                                    return (
                                        <button
                                            key={skill}
                                            className={`ai-match-skill-toggle-btn ${isAdded ? 'added' : ''}`}
                                            onClick={() => toggleSkill(skill)}
                                            disabled={isToggling}
                                        >
                                            {isToggling ? '...' : isAdded ? '[OK]' : '+'} {skill}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </FloatingWindow>
    );
});

AIJobMatchWindow.displayName = 'AIJobMatchWindow';

export default AIJobMatchWindow;
