import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
import { JOBS_PAGE_SIZE } from '../components/Dashboard/dashboardConstants';
import { buildJobSearchParams } from '../utils/jobSearchParams';
import useAuthenticatedQuery from './useAuthenticatedQuery';

const INITIAL_FORM = {
    name: '',
    q: '',
    country: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
    remoteOnly: false,
};

/**
 * Maneja las búsquedas de empleo guardadas: crearlas, listarlas, ejecutarlas
 * (mostrando/ocultando sus resultados) y borrarlas.
 *
 * Business logic for saved searches: CRUD operations, running searches,
 * and managing form state. Used by SavedSearchesWindow.
 */
const useSavedSearches = () => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();
    const {
        loading,
        refetch: refetchSearches,
    } = useAuthenticatedQuery(
        `${BACKEND_URL}/api/v1/saved-searches/`,
        { enabled: false },
    );

    const [searches, setSearches] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [expandedId, setExpandedId] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [resultsTotal, setResultsTotal] = useState(0);

    // Generacion de ejecucion: expandir otra busqueda guardada (o plegar la
    // actual) invalida la que siga en vuelo. Sin esto una respuesta lenta
    // aterriza sobre la tarjeta equivocada, o repuebla una ya plegada.
    const runGenerationRef = useRef(0);

    // Fetch saved searches on mount
    // Pide al servidor la lista de búsquedas guardadas.
    const fetchSearches = useCallback(async () => {
        const data = await refetchSearches();
        if (data === null) {
            setSearches([]);
            showToast(t('dashboard.savedSearches.errorLoad'));
            return;
        }
        setSearches(Array.isArray(data) ? data : data.results || data.data || []);
    }, [refetchSearches, t]);

    useEffect(() => {
        fetchSearches();
    }, [fetchSearches]);

    // Actualiza un campo del formulario de nueva búsqueda.
    const handleFormChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Build an auto-name from filters when no explicit name given
    // Si no se escribe un nombre, genera uno automático a partir de los
    // filtros elegidos.
    const autoName = useCallback(() => {
        const parts = [];
        if (formData.q) parts.push(formData.q);
        if (formData.country) parts.push(formData.country);
        if (formData.city) parts.push(formData.city);
        if (formData.salaryMin || formData.salaryMax) {
            const min = formData.salaryMin || '0';
            const max = formData.salaryMax || '...';
            parts.push(`$${min}-${max}`);
        }
        if (formData.remoteOnly) parts.push('Remote');
        return parts.join(' | ') || 'Search';
    }, [formData]);

    // Create a new saved search
    // Guarda una búsqueda nueva con los filtros del formulario.
    const handleCreate = useCallback(async () => {
        const name = formData.name.trim() || autoName();
        if (!name) return;

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/`, {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    filters: {
                        q: formData.q || undefined,
                        country: formData.country || undefined,
                        city: formData.city || undefined,
                        salary_min: formData.salaryMin ? Number(formData.salaryMin) : undefined,
                        salary_max: formData.salaryMax ? Number(formData.salaryMax) : undefined,
                        remote_only: formData.remoteOnly || undefined,
                    },
                }),
            });

            setFormData(INITIAL_FORM);
            setShowForm(false);
            fetchSearches();
        } catch {
            showToast(t('dashboard.savedSearches.errorCreate'));
        }
    }, [authenticatedFetch, formData, fetchSearches, autoName, t]);

    // Run a saved search (toggle expand/collapse)
    // Ejecuta una búsqueda guardada y muestra sus resultados (o los oculta
    // si ya estaban mostrados).
    const handleRun = useCallback(async (search) => {
        const generation = (runGenerationRef.current += 1);
        const isCurrent = () => generation === runGenerationRef.current;

        if (expandedId === search.id) {
            setExpandedId(null);
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }
        setExpandedId(search.id);
        setSearchLoading(true);
        setSearchResults([]);

        try {
            const filters = search.filters || {};
            const params = buildJobSearchParams({
                // legacy `technologies` overrides q, matching the previous order
                q: filters.technologies?.length > 0 ? filters.technologies.join(' ') : filters.q,
                country: filters.country,
                city: filters.city,
                salaryMin: filters.salary_min,
                salaryMax: filters.salary_max,
                remoteOnly: filters.remote_only,
                limit: JOBS_PAGE_SIZE,
                // DT-161: esta vista previa declaraba `oneshot: true` ("pido la
                // pagina 1 y no continuo") para no sobrescribir la anotacion de
                // que motor servia la busqueda del filtro avanzado y romperle su
                // "cargar mas". Con un solo motor no hay anotacion que pisar.
            });

            const response = await authenticatedFetch(
                `${BACKEND_URL}/api/v1/jobs/search?${params.toString()}`
            );
            const data = await response.json();
            if (!isCurrent()) return;
            setSearchResults(data.data || []);
            // Contrato unificado local/core: bajo el feed keyset del core
            // `total` es null — se muestra al menos lo recibido, nunca 0.
            setResultsTotal(data.metadata?.total ?? data.data?.length ?? 0);
        } catch {
            if (!isCurrent()) return;
            showToast(t('dashboard.savedSearches.errorRun'));
            setSearchResults([]);
            setResultsTotal(0);
        } finally {
            // Apagar el indicador solo si nadie ha tomado el relevo.
            if (isCurrent()) setSearchLoading(false);
        }
    }, [authenticatedFetch, expandedId, t]);

    // Delete a saved search
    // Borra una búsqueda guardada, pidiendo confirmación antes.
    const handleDelete = useCallback(async (id) => {
        const confirmed = window.confirm(t('dashboard.savedSearches.confirmDelete'));
        if (!confirmed) return;

        try {
            await authenticatedFetch(`${BACKEND_URL}/api/v1/saved-searches/${id}`, {
                method: 'DELETE',
            });
            setSearches(prev => prev.filter(s => s.id !== id));
            if (expandedId === id) {
                // Borrar la expandida tambien invalida su ejecucion en vuelo.
                runGenerationRef.current += 1;
                setExpandedId(null);
                setSearchResults([]);
                setSearchLoading(false);
            }
        } catch {
            showToast(t('dashboard.savedSearches.errorDelete'));
            fetchSearches();
        }
    }, [authenticatedFetch, fetchSearches, t, expandedId]);

    // Whether the form has any filter filled in
    const hasAnyFilter = formData.q || formData.country || formData.city
        || formData.salaryMin || formData.salaryMax || formData.remoteOnly;

    return {
        searches,
        loading,
        showForm,
        setShowForm,
        formData,
        hasAnyFilter,
        handleFormChange,
        autoName,
        handleCreate,
        handleRun,
        handleDelete,
        expandedId,
        setExpandedId,
        searchResults,
        searchLoading,
        resultsTotal,
    };
};

export default useSavedSearches;
