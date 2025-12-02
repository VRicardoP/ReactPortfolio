import { memo, useMemo, useState, useCallback } from 'react';
import FloatingWindow from '../Windows/FloatingWindow';

const JobBoardWindow = memo(({ data, initialPosition }) => {
    const [filters, setFilters] = useState({
        country: '',
        skill: '',
        search: ''
    });

    // extraer opciones unicas para los filtros
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

    // filtrar trabajos segun los filtros activos
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

    if (!data?.data || data.data.length === 0) {
        return (
            <FloatingWindow
                id="jobboard-window"
                title="Job Board"
                initialPosition={initialPosition}
                initialSize={{ width: 650, height: 500 }}
            >
                <div className="jobboard-empty">
                    No jobs available at the moment
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
                {/* filtros */}
                <div className="jobboard-filters">
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="jobboard-search"
                    />

                    <select
                        value={filters.country}
                        onChange={(e) => handleFilterChange('country', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Countries</option>
                        {filterOptions.countries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>

                    <select
                        value={filters.skill}
                        onChange={(e) => handleFilterChange('skill', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Skills</option>
                        {filterOptions.skills.map(skill => (
                            <option key={skill} value={skill}>{skill}</option>
                        ))}
                    </select>

                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="jobboard-clear-btn">
                            Clear
                        </button>
                    )}
                </div>

                {/* contador de resultados */}
                <div className="jobboard-count">
                    Showing {filteredJobs.length} of {data.data.length} jobs
                </div>

                {/* lista de trabajos */}
                <div className="jobboard-list">
                    {filteredJobs.length === 0 ? (
                        <div className="jobboard-no-results">
                            No jobs match your filters
                        </div>
                    ) : (
                        filteredJobs.map(job => (
                            <div key={job.id} className="jobboard-card">
                                <div className="jobboard-card-header">
                                    <h3 className="jobboard-title">{job.title}</h3>
                                    <span className="jobboard-type">{job.type || 'Full-time'}</span>
                                </div>

                                <div className="jobboard-company">{job.company}</div>

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
                                    </span>
                                    <a
                                        href={job.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="jobboard-apply-btn"
                                    >
                                        Apply
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
