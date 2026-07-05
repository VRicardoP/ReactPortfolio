/**
 * Build the query string for GET /api/v1/jobs/search from a normalized filter
 * object. Shared by useJobFilter and useSavedSearches, which each map their own
 * (camelCase vs snake_case) field names into this shape before calling.
 *
 * Falsy values are omitted (same as the previous inline builders). `limit` /
 * `offset` are included only when provided.
 */
export function buildJobSearchParams({
    q,
    country,
    city,
    salaryMin,
    salaryMax,
    remoteOnly,
    limit,
    offset,
} = {}) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (country) params.set('country', country);
    if (city) params.set('city', city);
    if (salaryMin) params.set('salary_min', String(salaryMin));
    if (salaryMax) params.set('salary_max', String(salaryMax));
    if (remoteOnly) params.set('remote_only', 'true');
    if (limit != null) params.set('limit', String(limit));
    if (offset != null) params.set('offset', String(offset));
    return params;
}
