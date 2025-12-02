import { memo, useMemo, useState, useCallback } from 'react';
import FloatingWindow from '../Windows/FloatingWindow';

const ArbeitnowJobBoardWindow = memo(({ data, initialPosition }) => {
    const [filters, setFilters] = useState({
        location: '',
        tag: '',
        jobType: '',
        remote: '',
        search: ''
    });

    // extraer opciones unicas para los filtros
    const filterOptions = useMemo(() => {
        if (!data?.data) return { locations: [], tags: [], jobTypes: [] };

        const locations = new Set();
        const tags = new Set();
        const jobTypes = new Set();

        data.data.forEach(job => {
            if (job.location) locations.add(job.location);
            if (job.tags) {
                job.tags.forEach(tag => tags.add(tag));
            }
            if (job.job_types) {
                job.job_types.forEach(type => jobTypes.add(type));
            }
        });

        return {
            locations: Array.from(locations).sort(),
            tags: Array.from(tags).sort(),
            jobTypes: Array.from(jobTypes).sort()
        };
    }, [data]);

    // filtrar trabajos segun los filtros activos
    const filteredJobs = useMemo(() => {
        if (!data?.data) return [];

        return data.data.filter(job => {
            const matchesLocation = !filters.location || job.location === filters.location;
            const matchesTag = !filters.tag || (job.tags && job.tags.includes(filters.tag));
            const matchesJobType = !filters.jobType || (job.job_types && job.job_types.includes(filters.jobType));
            const matchesRemote = filters.remote === '' ||
                (filters.remote === 'remote' && job.remote === true) ||
                (filters.remote === 'onsite' && job.remote === false);
            const matchesSearch = !filters.search ||
                job.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.company_name?.toLowerCase().includes(filters.search.toLowerCase());

            return matchesLocation && matchesTag && matchesJobType && matchesRemote && matchesSearch;
        });
    }, [data, filters]);

    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ location: '', tag: '', jobType: '', remote: '', search: '' });
    }, []);

    const hasActiveFilters = filters.location || filters.tag || filters.jobType || filters.remote || filters.search;

    // formatear fecha desde timestamp unix
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp * 1000).toLocaleDateString();
    };

    if (!data?.data || data.data.length === 0) {
        return (
            <FloatingWindow
                id="arbeitnow-jobboard-window"
                title="Arbeitnow Jobs"
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
            id="arbeitnow-jobboard-window"
            title="Arbeitnow - EU Remote Jobs"
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
                        <option value="">All Locations</option>
                        {filterOptions.locations.map(location => (
                            <option key={location} value={location}>{location}</option>
                        ))}
                    </select>

                    <select
                        value={filters.tag}
                        onChange={(e) => handleFilterChange('tag', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Categories</option>
                        {filterOptions.tags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
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
                            <div key={job.slug} className="jobboard-card arbeitnow-card">
                                <div className="jobboard-card-header">
                                    <h3 className="jobboard-title">{job.title}</h3>
                                    <span className={`jobboard-type ${job.remote ? 'arbeitnow-remote' : 'arbeitnow-onsite'}`}>
                                        {job.remote ? 'Remote' : 'On-site'}
                                    </span>
                                </div>

                                <div className="jobboard-company">{job.company_name}</div>

                                <div className="jobboard-meta">
                                    <span className="jobboard-country">{job.location || 'Europe'}</span>
                                    {job.job_types && job.job_types.length > 0 && (
                                        <span className="jobboard-industry">{job.job_types.join(', ')}</span>
                                    )}
                                </div>

                                {job.tags && job.tags.length > 0 && (
                                    <div className="jobboard-skills">
                                        {job.tags.slice(0, 5).map(tag => (
                                            <span
                                                key={tag}
                                                className="jobboard-skill-tag arbeitnow-tag"
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
                                        {formatDate(job.created_at)}
                                    </span>
                                    <a
                                        href={job.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="jobboard-apply-btn arbeitnow-apply"
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

ArbeitnowJobBoardWindow.displayName = 'ArbeitnowJobBoardWindow';

export default ArbeitnowJobBoardWindow;
