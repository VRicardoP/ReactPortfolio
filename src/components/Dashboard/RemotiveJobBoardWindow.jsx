import { memo, useMemo, useState, useCallback } from 'react';
import FloatingWindow from '../Windows/FloatingWindow';

const RemotiveJobBoardWindow = memo(({ data, initialPosition }) => {
    const [filters, setFilters] = useState({
        location: '',
        tag: '',
        category: '',
        search: ''
    });

    // extraer opciones unicas para los filtros
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

    // filtrar trabajos segun los filtros activos
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

    if (!data?.data || data.data.length === 0) {
        return (
            <FloatingWindow
                id="remotive-jobboard-window"
                title="Remotive Jobs"
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
            id="remotive-jobboard-window"
            title="Remotive - Remote Jobs"
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
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Categories</option>
                        {filterOptions.categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>

                    <select
                        value={filters.tag}
                        onChange={(e) => handleFilterChange('tag', e.target.value)}
                        className="jobboard-select"
                    >
                        <option value="">All Tags</option>
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
                            <div key={job.id} className="jobboard-card remotive-card">
                                <div className="jobboard-card-header">
                                    <h3 className="jobboard-title">{job.title}</h3>
                                    <span className="jobboard-type">{job.job_type || 'Full-time'}</span>
                                </div>

                                <div className="jobboard-company">{job.company}</div>

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
                                    </span>
                                    <a
                                        href={job.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="jobboard-apply-btn remotive-apply"
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

RemotiveJobBoardWindow.displayName = 'RemotiveJobBoardWindow';

export default RemotiveJobBoardWindow;
