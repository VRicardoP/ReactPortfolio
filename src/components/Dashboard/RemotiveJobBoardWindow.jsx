import { memo, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import JobBoardControls from './JobBoardControls';
import useJobBoardControls from '../../hooks/useJobBoardControls';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';

const RemotiveJobBoardWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState({
        location: '',
        tag: '',
        category: '',
        search: ''
    });

    // extract unique options for the filters
    const filterOptions = useMemo(() => {
        if (!data?.data) return { locations: [], tags: [], categories: [] };

        const locations = new Set();
        const tags = new Set();
        const categories = new Set();

        data.data.forEach(job => {
            if (job.location) locations.add(job.location);
            if (job.category) categories.add(job.category);
            if (job.tags) {
                job.tags.forEach(tag => tags.add(tag));
            }
        });

        return {
            locations: Array.from(locations).sort(),
            tags: Array.from(tags).sort(),
            categories: Array.from(categories).sort()
        };
    }, [data]);

    // filter jobs according to active filters
    const filteredJobs = useMemo(() => {
        if (!data?.data) return [];

        return data.data.filter(job => {
            const matchesLocation = !filters.location || job.location === filters.location;
            const matchesTag = !filters.tag || (job.tags && job.tags.includes(filters.tag));
            const matchesCategory = !filters.category || job.category === filters.category;
            const matchesSearch = !filters.search ||
                job.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.company?.toLowerCase().includes(filters.search.toLowerCase());

            return matchesLocation && matchesTag && matchesCategory && matchesSearch;
        });
    }, [data, filters]);

    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ location: '', tag: '', category: '', search: '' });
    }, []);

    const hasActiveFilters = filters.location || filters.tag || filters.category || filters.search;

    const { sortBy, handleSortChange, pagedJobs, page, totalPages, from, to, setPage } =
        useJobBoardControls(filteredJobs, { dateField: 'date', companyField: 'company', titleField: 'title' });

    if (!data?.data || data.data.length === 0) {
        return (
            <FloatingWindow
                id="remotive-jobboard-window"
                title="Remotive Jobs"
                initialPosition={initialPosition}
                initialSize={{ width: 650, height: 500 }}
            >
                <div className="jobboard-empty">
                    {t('dashboard.jobBoard.noJobs')}
                </div>
            </FloatingWindow>
        );
    }

    return (
        <FloatingWindow
            id="remotive-jobboard-window"
            title="Remotive - Remote Jobs"
            initialPosition={initialPosition}
            initialSize={{ width: 700, height: 550 }}
        >
            <div className="jobboard-container">
                {/* filters */}
                <div className="jobboard-filters">
                    <input
                        type="text"
                        placeholder={t('dashboard.jobBoard.searchPlaceholder')}
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="jobboard-search"
                    />

                    <select
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">{t('dashboard.jobBoard.allLocations')}</option>
                        {filterOptions.locations.map(location => (
                            <option key={location} value={location}>{location}</option>
                        ))}
                    </select>

                    <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">{t('dashboard.jobBoard.allCategories')}</option>
                        {filterOptions.categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>

                    <select
                        value={filters.tag}
                        onChange={(e) => handleFilterChange('tag', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">{t('dashboard.jobBoard.allTags')}</option>
                        {filterOptions.tags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>

                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="jobboard-clear-btn">
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
                    cacheAge={data.last_updated}
                />

                {/* job list */}
                <div className="jobboard-list">
                    {pagedJobs.length === 0 ? (
                        <div className="jobboard-no-results">
                            {t('dashboard.jobBoard.noMatch')}
                        </div>
                    ) : (
                        pagedJobs.map(job => (
                            <div key={job.id} className="jobboard-card remotive-card">
                                <div className="jobboard-card-header">
                                    <h3 className="jobboard-title">{job.title}</h3>
                                    <span className="jobboard-type">{job.job_type || 'Full-time'}</span>
                                </div>

                                <div className="jobboard-company"><CompanyResearchName company={job.company}>{job.company}</CompanyResearchName></div>

                                <div className="jobboard-meta">
                                    <span className="jobboard-country">{job.location || 'Worldwide'}</span>
                                    {job.category && (
                                        <span className="jobboard-industry">{job.category}</span>
                                    )}
                                </div>

                                {job.tags && job.tags.length > 0 && (
                                    <div className="jobboard-skills">
                                        {job.tags.slice(0, 5).map(tag => (
                                            <span
                                                key={tag}
                                                className="jobboard-skill-tag remotive-tag"
                                                onClick={() => handleFilterChange('tag', tag)}
                                            >
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
                                        {new Date(job.date).toLocaleDateString()}
                                        <FreshnessBadge dateStr={job.date} />
                                    </span>
                                    <a
                                        href={job.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="jobboard-apply-btn remotive-apply"
                                    >
                                        {t('dashboard.jobBoard.apply')}
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

RemotiveJobBoardWindow.displayName = 'RemotiveJobBoardWindow';

export default RemotiveJobBoardWindow;
