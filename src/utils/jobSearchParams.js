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
 * `sequence` es el token opaco de secuencia que el backend acuña al servir la
 * pagina 1 y publica en `metadata.sequence`. Reenviarlo en las paginas >=2 (como
 * `seq`) es lo que aisla ESTA secuencia de las demas del mismo host: sin el, el
 * backend cae a su respaldo por IP y dos pestañas —o la peticion duplicada de
 * React StrictMode— comparten anotacion y pueden mezclar corpus e identidades
 * entre el motor core y el local (P2-1 auditoria G8: el token existia en el
 * servidor desde G7 y NINGUN cliente lo reenviaba).
 *
 * `oneshot` declara que esta peticion NO va a paginar, y con ello que el backend
 * no debe abrir secuencia: no acuña token, no pisa la anotacion compartida de la
 * consulta y no consume huecos del registro. Es EXPLICITO y opt-in, nunca por
 * defecto: solo lo pide quien sabe que no continua —la vista previa de una
 * busqueda guardada—, porque el servidor no puede distinguirla de una pagina 1
 * que si paginara (G10-9 auditoria G10). Ponerlo en un cliente que si pagina le
 * rompe su propio "cargar mas".
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
    sequence,
    oneshot,
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
    if (sequence) params.set('seq', sequence);
    if (oneshot) params.set('oneshot', 'true');
    return params;
}
