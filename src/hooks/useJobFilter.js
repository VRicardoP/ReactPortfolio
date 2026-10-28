import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { showToast } from '../components/UI/Toast';
import { JOBS_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';
import { buildJobSearchParams } from '../utils/jobSearchParams';
import { formatFilterSalary } from '../utils/formatSalary';
import useAuthenticatedQuery from './useAuthenticatedQuery';

const INITIAL_FILTERS = {
    country: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
    q: '',
    remoteOnly: false,
};

/**
 * Maneja el panel de filtros avanzados de ofertas: guarda los filtros
 * elegidos, busca con ellos, permite pedir "más resultados" sin perder los
 * ya mostrados, y descarta las respuestas tardías de búsquedas antiguas.
 *
 * Business logic for the job filter window: search state, filter management,
 * query building, cursor/offset pagination ("load more"), and
 * save-to-saved-searches integration. Used by AdvancedFilterPanel.
 *
 * Pagination contract: metadata carries `total` (null cuando el núcleo central
 * sirve por cursor — "keyset": en vez de pedir "página 3", el backend pide
 * "lo que viene después de este punto", y entonces no sabe de antemano cuántas
 * páginas hay en total, así que `total` no puede rellenarse sin contar el
 * corpus entero), `has_more` y `next_cursor`. El hook nunca depende de `total`
 * para paginar: "cargar mas" sigue `next_cursor` cuando viene y un desplazamiento
 * acumulado cuando no, guiado por `has_more`.
 *
 * DT-161: aqui se guardaba y reenviaba `metadata.sequence`, un token que el
 * backend acuñaba al servir la pagina 1 para que las paginas siguientes
 * salieran del MISMO motor de busqueda. Antes de la migracion al nucleo
 * central (DT-144) habia DOS motores posibles sirviendo resultados (el local
 * de este backend y el del nucleo), y mezclar paginas de uno y otro a mitad
 * de una busqueda daba resultados incoherentes — de ahi el token. Con un solo
 * motor no hay nada que mezclar, asi que el token y su hilo se han retirado.
 *
 * @param {Function} [onSaveSearch] — optional callback to save current filters
 */
const useJobFilter = (onSaveSearch) => {
    const { t } = useTranslation();
    const { refetch: fetchJobs } = useAuthenticatedQuery(null, {
        enabled: false,
        throwOnError: true,
    });

    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(null); // null = unknown (core keyset feed)
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Generacion de peticion: cada busqueda nueva (y el "limpiar") invalida lo
    // que siga en vuelo. Sin esto una respuesta lenta de la busqueda anterior
    // aterriza sobre la actual y deja estado hibrido — filtros nuevos con
    // resultados, cursor y token de secuencia viejos (P2-1 auditoria externa).
    const requestGenerationRef = useRef(0);

    // Actualiza un filtro concreto (país, ciudad, salario...).
    const handleFilterChange = useCallback((field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    }, []);

    // Construye los parámetros de la URL de búsqueda a partir de los filtros actuales.
    const buildQueryParams = useCallback(({ offset = 0, cursor = null } = {}) => {
        return buildJobSearchParams({
            q: filters.q,
            country: filters.country,
            city: filters.city,
            salaryMin: filters.salaryMin,
            salaryMax: filters.salaryMax,
            remoteOnly: filters.remoteOnly,
            limit: JOBS_PAGE_SIZE,
            // The core keyset cursor already encodes the position: never send
            // both cursor and a non-zero offset.
            offset: cursor ? undefined : offset,
            cursor,
        }).toString();
    }, [filters]);

    // Pide una página de resultados con los filtros actuales, bien como
    // búsqueda nueva o como continuación ("cargar más") de la anterior.
    const fetchPage = useCallback(async ({ offset = 0, cursor = null, append = false }) => {
        // Una busqueda abre generacion nueva; un "cargar mas" continua la vigente.
        const generation = append
            ? requestGenerationRef.current
            : (requestGenerationRef.current += 1);
        const isCurrent = () => generation === requestGenerationRef.current;

        setLoading(true);
        setSearched(true);
        try {
            const qs = buildQueryParams({ offset, cursor });
            const data = await fetchJobs(
                `/api/v1/jobs/search?${qs}`
            );
            if (!isCurrent()) return;
            const items = data.data || [];
            const meta = data.metadata || {};
            setResults(prev => (append ? [...prev, ...items] : items));
            setTotal(meta.total ?? null);
            setNextCursor(meta.next_cursor ?? null);
            // `has_more` drives the "load more" button; a full page is the
            // conservative fallback if the envelope ever omits it.
            setHasMore(meta.has_more ?? items.length === JOBS_PAGE_SIZE);
        } catch {
            if (!isCurrent()) return;
            showToast(t('dashboard.jobFilter.errorSearch'));
            // Un "cargar mas" que falla conserva las paginas ya mostradas Y su
            // posicion: que este intento fallara no prueba que no haya mas
            // paginas. Apagar `hasMore`/`nextCursor` dejaba al usuario con la
            // primera pagina de un corpus de cientos y sin camino de reintento
            // salvo relanzar la busqueda entera, y un corte del nucleo central
            // es alcanzable en produccion.
            if (append) return;
            setResults([]);
            setTotal(null);
            setHasMore(false);
            setNextCursor(null);
        } finally {
            // Apagar el indicador solo si nadie ha tomado el relevo: si una
            // busqueda mas nueva sigue en vuelo, manda la suya.
            if (isCurrent()) setLoading(false);
        }
    }, [buildQueryParams, fetchJobs, t]);

    // Lanza una búsqueda nueva desde el principio.
    const handleSearch = useCallback(() => fetchPage({ offset: 0 }), [fetchPage]);

    // Pide la siguiente página de resultados, añadiéndola a los que ya se
    // estaban mostrando (en vez de sustituirlos).
    const handleLoadMore = useCallback(() => {
        if (loading) return Promise.resolve();
        // Cursor cuando el backend lo dio (keyset del nucleo central);
        // desplazamiento acumulado cuando no.
        return fetchPage(
            nextCursor
                ? { cursor: nextCursor, append: true }
                : { offset: results.length, append: true }
        );
    }, [fetchPage, nextCursor, results.length, loading]);

    // Borra todos los filtros y resultados, volviendo al estado inicial.
    const handleClear = useCallback(() => {
        // Vaciar la vista invalida tambien lo pendiente: nada en vuelo debe
        // repoblar los resultados que el usuario acaba de limpiar.
        requestGenerationRef.current += 1;
        setLoading(false);
        setFilters(INITIAL_FILTERS);
        setResults([]);
        setTotal(null);
        setHasMore(false);
        setNextCursor(null);
        setSearched(false);
    }, []);

    // Guarda los filtros actuales como una búsqueda favorita.
    const handleSave = useCallback(() => {
        if (onSaveSearch) {
            onSaveSearch({
                country: filters.country,
                city: filters.city,
                salaryMin: filters.salaryMin,
                salaryMax: filters.salaryMax,
                q: filters.q,
                remoteOnly: filters.remoteOnly,
            });
        }
    }, [onSaveSearch, filters]);

    const hasFilters = filters.country || filters.city
        || filters.salaryMin || filters.salaryMax || filters.q || filters.remoteOnly;

    return {
        filters,
        results,
        total,
        hasMore,
        nextCursor,
        loading,
        searched,
        hasFilters,
        handleFilterChange,
        buildQueryParams,
        handleSearch,
        handleLoadMore,
        handleClear,
        handleSave,
        formatSalary: formatFilterSalary,
    };
};

export default useJobFilter;
