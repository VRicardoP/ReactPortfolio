import { memo, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';
import JobBoardControls from './JobBoardControls';
import useJobBoardControls from '../../hooks/useJobBoardControls';
import { FreshnessBadge, CompanyResearchName } from './JobCardExtras';

const JobBoardWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState({
        country: '',
        skill: '',
        search: ''
    });

    // extract unique options for the filters
    const filterOptions = useMemo(() => {
        if (!data?.data) return { countries: [], skills: [] };

        const countries = new Set();
        const skills = new Set();

        data.data.forEach(job => {
            if (job.country) countries.add(job.country);
            if (job.skills) {
                job.skills.forEach(skill => skills.add(skill));
            }
        });

        return {
            countries: Array.from(countries).sort(),
            skills: Array.from(skills).sort()
        };
    }, [data]);

    // filter jobs according to active filters
    const filteredJobs = useMemo(() => {
        if (!data?.data) return [];

        return data.data.filter(job => {
            const matchesCountry = !filters.country || job.country === filters.country;
            const matchesSkill = !filters.skill || (job.skills && job.skills.includes(filters.skill));
            const matchesSearch = !filters.search ||
                job.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.company?.toLowerCase().includes(filters.search.toLowerCase());

            return matchesCountry && matchesSkill && matchesSearch;
        });
    }, [data, filters]);

    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ country: '', skill: '', search: '' });
    }, []);

    const hasActiveFilters = filters.country || filters.skill || filters.search;

    const { sortBy, handleSortChange, pagedJobs, page, totalPages, from, to, setPage } =
        useJobBoardControls(filteredJobs, { dateField: 'date', companyField: 'company', titleField: 'title' });

    if (!data?.data || data.data.length === 0) {
        return (
            <FloatingWindow
                id="jobboard-window"
                title="Job Board"
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
            id="jobboard-window"
            title="Job Board - Remote Tech Jobs"
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
                        value={filters.country}
                        onChange={(e) => handleFilterChange('country', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">{t('dashboard.jobBoard.allCountries')}</option>
                        {filterOptions.countries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>

                    <select
                        value={filters.skill}
                        onChange={(e) => handleFilterChange('skill', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">{t('dashboard.jobBoard.allSkills')}</option>
                        {filterOptions.skills.map(skill => (
                            <option key={skill} value={skill}>{skill}</option>
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
                            <div key={job.id} className="jobboard-card">
                                <div className="jobboard-card-header">
                                    <h3 className="jobboard-title">{job.title}</h3>
                                    <span className="jobboard-type">{job.type || 'Full-time'}</span>
                                </div>

                                <div className="jobboard-company"><CompanyResearchName company={job.company}>{job.company}</CompanyResearchName></div>

                                <div className="jobboard-meta">
                                    <span className="jobboard-country">{job.country}</span>
                                    {job.industry && (
                                        <span className="jobboard-industry">{job.industry}</span>
                                    )}
                                </div>

                                {job.skills && job.skills.length > 0 && (
                                    <div className="jobboard-skills">
                                        {job.skills.slice(0, 5).map(skill => (
                                            <span
                                                key={skill}
                                                className="jobboard-skill-tag"
                                                onClick={() => handleFilterChange('skill', skill)}
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {job.skills.length > 5 && (
                                            <span className="jobboard-skill-more">
                                                +{job.skills.length - 5}
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
                                        className="jobboard-apply-btn"
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

JobBoardWindow.displayName = 'JobBoardWindow';

export default JobBoardWindow;
