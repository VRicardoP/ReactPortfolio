// Convierte los filtros de búsqueda de empleo (palabra, país, ciudad,
// salario, remoto...) en los parámetros que hay que añadir a la URL para
// pedirle al servidor esa búsqueda.
/**
 * Build the query string for GET /api/v1/jobs/search from a normalized filter
 * object. Shared by useJobFilter and useSavedSearches, which each map their own
 * (camelCase vs snake_case) field names into this shape before calling.
 *
 * Falsy values are omitted (same as the previous inline builders). `limit` /
 * `offset` are included only when provided. `cursor` is the opaque keyset
 * cursor from the unified-search envelope (`metadata.next_cursor`, core
 * routing) — pass it INSTEAD of `offset` to fetch the next page.
 *
 * DT-161: aqui se enviaban dos parametros mas, `seq` y `oneshot`, y el backend
 * ya no los acepta. Servian para que, cuando habia DOS motores de catalogo (el
 * local de este backend y el del nucleo central), la pagina 1 y la pagina 2 de
 * una misma busqueda no vinieran de motores distintos: el servidor acuñaba un
 * token al servir la pagina 1, el cliente lo reenviaba, y `oneshot` declaraba
 * "no voy a paginar" para no abrir secuencia. Desde el traspaso hay UN SOLO
 * motor y la mezcla es imposible, asi que todo ese mecanismo sobra.
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
    cursor,
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
    if (cursor) params.set('cursor', cursor);
    return params;
}
