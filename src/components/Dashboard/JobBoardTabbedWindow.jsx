import { memo, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SOURCE_TAB_DATA, SOURCE_KEYS, SOURCE_COLOR_MAP, normalizeJob, extractJobs } from '../../config/jobSources';
import FloatingWindow from '../Windows/FloatingWindow';
import JobBoardControls from './JobBoardControls';
import useJobBoardControls from '../../hooks/useJobBoardControls';
import useJobApplication from '../../hooks/useJobApplication';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';

const JobBoardTabbedWindow = memo(({ jobData, initialPosition }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const { handleApply, appliedIds } = useJobApplication();

    // Normalize all jobs per source
    const normalizedBySource = useMemo(() => {
        if (!jobData) return {};
        const result = {};
        for (const source of SOURCE_KEYS) {
            const raw = extractJobs(jobData[source]);
            result[source] = raw.map(j => normalizeJob(j, source));
        }
        return result;
    }, [jobData]);

    // Count per source for badges
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
    const currentJobs = useMemo(() => {
        if (activeTab === 'all') {
            return Object.values(normalizedBySource).flat();
        }
        return normalizedBySource[activeTab] || [];
    }, [activeTab, normalizedBySource]);

    // Filter by search
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

    const handleTabChange = useCallback((key) => {
        setActiveTab(key);
        setPage(0);
        setSearch('');
    }, [setPage]);

    const sourceColor = useCallback((source) => {
        return SOURCE_COLOR_MAP[source] || theme.primary;
    }, [theme.primary]);

    return (
        <FloatingWindow
            id="job-board-window"
            title={t('dashboard.jobBoard.windowTitle', { defaultValue: 'Job Board' })}
            initialPosition={initialPosition}
            initialSize={{ width: 750, height: 600 }}
        >
            <div className="jobboard-container">
                {/* Tab bar */}
                <div className="job-tabs" role="tablist" aria-label={t('dashboard.jobBoard.windowTitle', { defaultValue: 'Job Board' })}>
                    {SOURCE_TAB_DATA.map(tab => (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            className={`job-tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => handleTabChange(tab.key)}
                            style={{
                                '--tab-color': tab.color,
                            }}
                        >
                            <span className="job-tab-label">
                                {t(`dashboard.jobBoard.tab${tab.key.charAt(0).toUpperCase() + tab.key.slice(1)}`)}
                            </span>
                            {sourceCounts[tab.key] > 0 && (
                                <span
                                    className="job-tab-badge"
                                    style={{
                                        backgroundColor: `${tab.color}22`,
                                        color: tab.color,
                                    }}
                                >
                                    {sourceCounts[tab.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="jobboard-filters">
                    <input
                        type="text"
                        placeholder={t('dashboard.jobBoard.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="jobboard-search"
                        style={{ flex: 1 }}
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
                            <div key={job.id} className="jobboard-card">
                                <div className="jobboard-card-header">
                                    <h3 className="jobboard-title">{job.title}</h3>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                                        {job.remote && (
                                            <span className="jobboard-remote-badge">REMOTE</span>
                                        )}
                                        {activeTab === 'all' && (
                                            <span
                                                className="jobboard-source-badge"
                                                style={{
                                                    backgroundColor: `${sourceColor(job.source)}22`,
                                                    color: sourceColor(job.source),
                                                    borderColor: `${sourceColor(job.source)}55`,
                                                }}
                                            >
                                                {job.source}
                                            </span>
                                        )}
                                        {job.employmentType && (
                                            <span className="jobboard-type">{job.employmentType}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="jobboard-company">
                                    <CompanyResearchName company={job.company}>{job.company}</CompanyResearchName>
                                </div>

                                {job.location && (
                                    <div className="jobboard-meta">
                                        <span className="jobboard-country">{job.location}</span>
                                    </div>
                                )}

                                {job.tags && job.tags.length > 0 && (
                                    <div className="jobboard-skills">
                                        {job.tags.slice(0, 5).map(tag => (
                                            <span key={tag} className="jobboard-skill-tag">
                                                {tag}
                                            </span>
                                        ))}
                                        {job.tags.length > 5 && (
                                            <span className="jobboard-skill-more">
                                                +{job.tags.length - 5}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="jobboard-card-footer">
                                    <span className="jobboard-date">
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
                        ))
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

JobBoardTabbedWindow.displayName = 'JobBoardTabbedWindow';

export default JobBoardTabbedWindow;
