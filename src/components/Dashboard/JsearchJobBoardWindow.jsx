import { memo, useMemo, useState, useCallback } from 'react';
import FloatingWindow from '../Windows/FloatingWindow';

const JsearchJobBoardWindow = memo(({ data, initialPosition }) => {
    const [filters, setFilters] = useState({
        location: '',
        employer: '',
        employmentType: '',
        remote: '',
        source: '',
        search: ''
    });

    // normalizar los datos - puede venir como data.data o directamente como array
    const jobs = useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.jobs)) return data.jobs;
        return [];
    }, [data]);

    // extraer opciones unicas para los filtros
    const filterOptions = useMemo(() => {
        if (jobs.length === 0) return { locations: [], employers: [], employmentTypes: [], sources: [] };

        const locations = new Set();
        const employers = new Set();
        const employmentTypes = new Set();
        const sources = new Set();

        jobs.forEach(job => {
            // soportar ambos formatos de campo (job_city o city)
            const city = job.job_city || job.city;
            const employer = job.employer_name || job.employer;
            const empType = job.job_employment_type || job.employment_type;
            const publisher = job.job_publisher || job.publisher;

            if (city) locations.add(city);
            if (employer) employers.add(employer);
            if (empType) employmentTypes.add(empType);
            if (publisher) sources.add(publisher);
        });

        return {
            locations: Array.from(locations).sort(),
            employers: Array.from(employers).sort(),
            employmentTypes: Array.from(employmentTypes).sort(),
            sources: Array.from(sources).sort()
        };
    }, [jobs]);

    // filtrar trabajos segun los filtros activos
    const filteredJobs = useMemo(() => {
        if (jobs.length === 0) return [];

        return jobs.filter(job => {
            // soportar ambos formatos de campo
            const city = job.job_city || job.city;
            const employer = job.employer_name || job.employer;
            const empType = job.job_employment_type || job.employment_type;
            const isRemote = job.job_is_remote ?? job.is_remote;
            const publisher = job.job_publisher || job.publisher;
            const title = job.job_title || job.title;

            const matchesLocation = !filters.location || city === filters.location;
            const matchesEmployer = !filters.employer || employer === filters.employer;
            const matchesEmploymentType = !filters.employmentType || empType === filters.employmentType;
            const matchesRemote = filters.remote === '' ||
                (filters.remote === 'remote' && isRemote === true) ||
                (filters.remote === 'onsite' && isRemote === false);
            const matchesSource = !filters.source || publisher === filters.source;
            const matchesSearch = !filters.search ||
                title?.toLowerCase().includes(filters.search.toLowerCase()) ||
                employer?.toLowerCase().includes(filters.search.toLowerCase());

            return matchesLocation && matchesEmployer && matchesEmploymentType && matchesRemote && matchesSource && matchesSearch;
        });
    }, [jobs, filters]);

    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ location: '', employer: '', employmentType: '', remote: '', source: '', search: '' });
    }, []);

    const hasActiveFilters = filters.location || filters.employer || filters.employmentType || filters.remote || filters.source || filters.search;

    // formatear salario
    const formatSalary = (job) => {
        const minSalary = job.job_min_salary || job.min_salary;
        const maxSalary = job.job_max_salary || job.max_salary;
        if (!minSalary && !maxSalary) return null;

        const currency = job.job_salary_currency || job.salary_currency || 'USD';
        const period = job.job_salary_period || 'year';

        if (minSalary && maxSalary) {
            return `${currency} ${minSalary.toLocaleString()}-${maxSalary.toLocaleString()}/${period}`;
        }
        if (minSalary) {
            return `${currency} ${minSalary.toLocaleString()}+/${period}`;
        }
        return `${currency} ${maxSalary.toLocaleString()}/${period}`;
    };

    if (jobs.length === 0) {
        return (
            <FloatingWindow
                id="jsearch-jobboard-window"
                title="JSearch Jobs"
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
            id="jsearch-jobboard-window"
            title="JSearch - Multi-Source Jobs"
            initialPosition={initialPosition}
            initialSize={{ width: 720, height: 580 }}
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
                        value={filters.remote}
                        onChange={(e) => handleFilterChange('remote', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Types</option>
                        <option value="remote">Remote</option>
                        <option value="onsite">On-site</option>
                    </select>

                    <select
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Cities</option>
                        {filterOptions.locations.map(location => (
                            <option key={location} value={location}>{location}</option>
                        ))}
                    </select>

                    <select
                        value={filters.source}
                        onChange={(e) => handleFilterChange('source', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Sources</option>
                        {filterOptions.sources.map(source => (
                            <option key={source} value={source}>{source}</option>
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
                    Showing {filteredJobs.length} of {jobs.length} jobs
                </div>

                {/* lista de trabajos */}
                <div className="jobboard-list">
                    {filteredJobs.length === 0 ? (
                        <div className="jobboard-no-results">
                            No jobs match your filters
                        </div>
                    ) : (
                        filteredJobs.map(job => {
                            // soportar ambos formatos de campo
                            const jobTitle = job.job_title || job.title;
                            const employerName = job.employer_name || job.employer;
                            const employerLogo = job.employer_logo;
                            const isRemote = job.job_is_remote ?? job.is_remote;
                            const city = job.job_city || job.city;
                            const state = job.job_state || job.state;
                            const country = job.job_country || job.country;
                            const empType = job.job_employment_type || job.employment_type;
                            const publisher = job.job_publisher || job.publisher;
                            const postedAt = job.job_posted_at || job.posted_at;
                            const applyLink = job.job_apply_link || job.apply_link;

                            return (
                                <div key={job.job_id} className="jobboard-card jsearch-card">
                                    <div className="jobboard-card-header">
                                        <div className="jsearch-title-row">
                                            {employerLogo && (
                                                <img
                                                    src={employerLogo}
                                                    alt={employerName}
                                                    className="jsearch-logo"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            )}
                                            <h3 className="jobboard-title">{jobTitle}</h3>
                                        </div>
                                        <span className={`jobboard-type ${isRemote ? 'jsearch-remote' : 'jsearch-onsite'}`}>
                                            {isRemote ? 'Remote' : 'On-site'}
                                        </span>
                                    </div>

                                    <div className="jobboard-company">{employerName}</div>

                                    <div className="jobboard-meta">
                                        <span className="jobboard-country">
                                            {city}{state ? `, ${state}` : ''}{country ? ` (${country})` : ''}
                                        </span>
                                        {empType && (
                                            <span className="jobboard-industry">{empType}</span>
                                        )}
                                    </div>

                                    {formatSalary(job) && (
                                        <div className="jsearch-salary">
                                            {formatSalary(job)}
                                        </div>
                                    )}

                                    {publisher && (
                                        <div className="jsearch-source">
                                            <span
                                                className="jsearch-source-tag"
                                                onClick={() => handleFilterChange('source', publisher)}
                                            >
                                                {publisher}
                                            </span>
                                        </div>
                                    )}

                                    <div className="jobboard-card-footer">
                                        <span className="jobboard-date">
                                            {postedAt || 'Recently'}
                                        </span>
                                        <a
                                            href={applyLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="jobboard-apply-btn jsearch-apply"
                                        >
                                            Apply
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

JsearchJobBoardWindow.displayName = 'JsearchJobBoardWindow';

export default JsearchJobBoardWindow;
