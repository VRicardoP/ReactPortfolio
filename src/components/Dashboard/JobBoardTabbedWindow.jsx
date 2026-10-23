// Ventana que junta las 20 fuentes de empleo en un solo tablero con
// pestañas (una por fuente, más "todas"), con buscador, orden, paginación
// y las tarjetas de oferta con botón de guardar.

import { memo, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SOURCE_TAB_DATA, SOURCE_KEYS, SOURCE_COLOR_MAP } from '../../config/jobSources';
import FloatingWindow from '../Windows/FloatingWindow';
import { WINDOW_SIZES } from '../../config/windowSizes';
import JobBoardControls from './JobBoardControls';
import TabBar from '../UI/TabBar';
import useJobBoardControls from '../../hooks/useJobBoardControls';
import useJobApplication from '../../hooks/useJobApplication';
import JobCard from './JobCard';

const JobBoardTabbedWindow = memo(({ jobData, initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const { openedIds, handleSave, savedIds } = useJobApplication();

    // Use pre-normalized data from useDashboardData (normalized at fetch time)
    // Reorganiza las ofertas ya normalizadas, agrupadas por fuente.
    const normalizedBySource = useMemo(() => {
        if (!jobData) return {};
        const result = {};
        for (const source of SOURCE_KEYS) {
            result[source] = jobData[source]?._normalized || [];
        }
        return result;
    }, [jobData]);

    // Count per source for badges
    // Cuenta cuántas ofertas hay por fuente (y el total), para las etiquetas de las pestañas.
    const sourceCounts = useMemo(() => {
        const counts = {};
        let total = 0;
        for (const [source, jobs] of Object.entries(normalizedBySource)) {
            counts[source] = jobs.length;
            total += jobs.length;
        }
        counts.all = total;
        return counts;
    }, [normalizedBySource]);

    // Jobs for current tab
    // Las ofertas que corresponden a la pestaña seleccionada.
    const currentJobs = useMemo(() => {
        if (activeTab === 'all') {
            return Object.values(normalizedBySource).flat();
        }
        return normalizedBySource[activeTab] || [];
    }, [activeTab, normalizedBySource]);

    // Filter by search
    // Filtra las ofertas de la pestaña actual por el texto buscado (título,
    // empresa o ubicación).
    const filteredJobs = useMemo(() => {
        if (!search) return currentJobs;
        const q = search.toLowerCase();
        return currentJobs.filter(job =>
            job.title.toLowerCase().includes(q) ||
            job.company.toLowerCase().includes(q) ||
            job.location.toLowerCase().includes(q)
        );
    }, [currentJobs, search]);

    const { sortBy, handleSortChange, pagedJobs, page, totalPages, from, to, setPage } =
        useJobBoardControls(filteredJobs, { dateField: 'date', companyField: 'company', titleField: 'title' });

    // Cambia de pestaña, volviendo a la primera página y borrando la búsqueda.
    const handleTabChange = useCallback((key) => {
        setActiveTab(key);
        setPage(0);
        setSearch('');
    }, [setPage]);

    // Da el color asociado a una fuente de empleo.
    const sourceColor = useCallback((source) => {
        return SOURCE_COLOR_MAP[source] || theme.primary;
    }, [theme.primary]);

    return (
        <FloatingWindow
            id="job-board-window"
            title={t('dashboard.jobBoard.windowTitle', { defaultValue: 'Job Board' })}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.jobBoard}
        >
            <div className="jobboard-container">
                <TabBar
                    className="job-tabs"
                    tabClassName="job-tab"
                    ariaLabel={t('dashboard.jobBoard.windowTitle', { defaultValue: 'Job Board' })}
                    active={activeTab}
                    onChange={handleTabChange}
                    tabs={SOURCE_TAB_DATA.map(tab => ({
                        ...tab,
                        label: (
                            <>
                                <span className="job-tab-label">
                                    {t(`dashboard.jobBoard.tab${tab.key.charAt(0).toUpperCase() + tab.key.slice(1)}`)}
                                </span>
                                {sourceCounts[tab.key] > 0 && (
                                    <span className="job-tab-badge" style={{
                                        backgroundColor: `${tab.color}22`,
                                        color: tab.color,
                                    }}>
                                        {sourceCounts[tab.key]}
                                    </span>
                                )}
                            </>
                        ),
                    }))}
                />

                {/* Search */}
                <div className="jobboard-filters">
                    {/* DT-135: style={{ flex: 1 }} commented because
                        dashboard-jobboard.css `.jobboard-search` already defines `flex: 1`. */}
                    <input
                        type="text"
                        placeholder={t('dashboard.jobBoard.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="jobboard-search"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="jobboard-clear-btn">
                            {t('dashboard.jobBoard.clear')}
                        </button>
                    )}
                </div>

                <JobBoardControls
                    sortBy={sortBy}
                    onSortChange={handleSortChange}
                    page={page}
                    totalPages={totalPages}
                    from={from}
                    to={to}
                    total={filteredJobs.length}
                    onPageChange={setPage}
                />

                {/* Job list */}
                <div className="jobboard-list">
                    {pagedJobs.length === 0 ? (
                        <div className="jobboard-no-results">
                            {filteredJobs.length === 0 && currentJobs.length === 0
                                ? t('dashboard.jobBoard.noJobs')
                                : t('dashboard.jobBoard.noMatch')
                            }
                        </div>
                    ) : (
                        pagedJobs.map(job => (
                            <JobCard
                                key={job.id}
                                job={job}
                                showSource={activeTab === 'all'}
                                sourceStyle={{
                                    backgroundColor: `${sourceColor(job.source)}22`,
                                    color: sourceColor(job.source),
                                    borderColor: `${sourceColor(job.source)}55`,
                                }}
                                actions={(
                                    <>
                                        {job.url && (
                                            <a href={job.url} target="_blank" rel="noopener noreferrer"
                                                className="jobboard-apply-btn">
                                                {t('dashboard.jobBoard.viewOffer')}
                                            </a>
                                        )}
                                        <button
                                            onClick={() => handleSave(job)}
                                            disabled={savedIds.has(job.id) || openedIds.has(job.id)}
                                            className={`jobboard-save-btn ${savedIds.has(job.id) || openedIds.has(job.id) ? 'saved' : ''}`}
                                        >
                                            {savedIds.has(job.id) || openedIds.has(job.id)
                                                ? t('dashboard.jobBoard.saved')
                                                : t('dashboard.jobBoard.save')}
                                        </button>
                                    </>
                                )}
                            />
                        ))
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

JobBoardTabbedWindow.displayName = 'JobBoardTabbedWindow';

export default JobBoardTabbedWindow;
