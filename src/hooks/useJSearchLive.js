import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
import { formatJobSalary } from '../utils/formatSalary';
import useAuthenticatedQuery from './useAuthenticatedQuery';

const COOLDOWN_SECONDS = 12;

const INITIAL_FORM_FIELDS = {
    query: '',
    country: 'us',
    date_posted: 'all',
    employment_type: 'all',
    remote_only: false,
};

/**
 * Business logic for the JSearch live search window: form state, cooldown timer,
 * search execution, and salary formatting.
 * Used by JSearchLiveWindow.
 */
// Maneja la ventana de búsqueda en vivo de JSearch: el formulario, el tiempo
// de espera entre búsquedas (para no saturar la API), y cómo formatear el salario.
const useJSearchLive = () => {
    const { t } = useTranslation();
    const { refetch: searchJobs } = useAuthenticatedQuery(null, {
        enabled: false,
        throwOnError: true,
    });

    const [formFields, setFormFields] = useState(INITIAL_FORM_FIELDS);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cooldownUntil, setCooldownUntil] = useState(0);
    const [cooldownTimer, setCooldownTimer] = useState(0);
    const cooldown = cooldownUntil > Date.now();

    // Generacion de busqueda: el Enter del input dispara `handleSearch` sin
    // mirar `loading` (el boton si lo mira) y el cooldown solo se arma tras el
    // exito, asi que dos consultas pueden volar a la vez. La que queda atras no
    // puede confirmar resultados, ni armar el cooldown, ni apagar el indicador.
    const searchGenerationRef = useRef(0);

    // Deriva la cuenta atrás de un instante absoluto: el intervalo solo pinta
    // el tiempo restante y no ejecuta efectos dentro de un updater de estado.
    useEffect(() => {
        if (!cooldownUntil) return undefined;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
            setCooldownTimer(remaining);
            if (remaining === 0) {
                setCooldownUntil(0);
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownUntil]);

    // Pone en marcha la cuenta atrás que impide buscar de nuevo demasiado pronto.
    const startCooldown = useCallback(() => {
        setCooldownTimer(COOLDOWN_SECONDS);
        setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
    }, []);

    // Actualiza un campo del formulario de búsqueda.
    const handleFieldChange = useCallback((field, value) => {
        setFormFields(prev => ({ ...prev, [field]: value }));
    }, []);

    // Lanza la búsqueda con los filtros actuales del formulario, y descarta
    // el resultado si mientras tanto se ha lanzado una búsqueda más reciente.
    const handleSearch = useCallback(async () => {
        if (cooldown || !formFields.query.trim()) return;

        const generation = (searchGenerationRef.current += 1);
        const isCurrent = () => generation === searchGenerationRef.current;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('q', formFields.query.trim());
            if (formFields.country) params.set('country', formFields.country);
            if (formFields.date_posted !== 'all') params.set('date_posted', formFields.date_posted);
            if (formFields.employment_type !== 'all') params.set('employment_type', formFields.employment_type);
            if (formFields.remote_only) params.set('remote_only', 'true');

            const data = await searchJobs(`${BACKEND_URL}/api/v1/jsearch-jobs/search?${params.toString()}`);
            if (!isCurrent()) return;
            setResults(Array.isArray(data) ? data : data.data || data.results || data.jobs || []);
            startCooldown();
        } catch {
            if (!isCurrent()) return;
            setResults([]);
            showToast(t('dashboard.jsearchLive.errorSearch'));
        } finally {
            // Apagar el indicador solo si nadie ha tomado el relevo.
            if (isCurrent()) setLoading(false);
        }
    }, [formFields, cooldown, searchJobs, startCooldown, t]);

    return {
        formFields,
        results,
        loading,
        cooldown,
        cooldownTimer,
        handleFieldChange,
        handleSearch,
        formatSalary: formatJobSalary,
    };
};

export default useJSearchLive;
