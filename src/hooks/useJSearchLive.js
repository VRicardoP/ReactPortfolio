import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';
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
    const [cooldown, setCooldown] = useState(false);
    const [cooldownTimer, setCooldownTimer] = useState(0);
    const timerRef = useRef(null);

    // Generacion de busqueda: el Enter del input dispara `handleSearch` sin
    // mirar `loading` (el boton si lo mira) y el cooldown solo se arma tras el
    // exito, asi que dos consultas pueden volar a la vez. La que queda atras no
    // puede confirmar resultados, ni armar el cooldown, ni apagar el indicador.
    const searchGenerationRef = useRef(0);

    // Cleanup timer on unmount
    // Al desmontar el componente, detiene el contador del tiempo de espera.
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Pone en marcha la cuenta atrás que impide buscar de nuevo demasiado pronto.
    const startCooldown = useCallback(() => {
        setCooldown(true);
        setCooldownTimer(COOLDOWN_SECONDS);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setCooldownTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    setCooldown(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
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

    /**
     * Format salary range from a job object's salary fields.
     * @param {Object} job — job object with optional salary fields
     * @returns {string|null} formatted salary string or null
     */
    // Da el rango de salario de una oferta en un texto legible, o nada si no
    // tiene datos de salario.
    const formatSalary = useCallback((job) => {
        const minSalary = job.job_min_salary || job.min_salary;
        const maxSalary = job.job_max_salary || job.max_salary;
        if (!minSalary && !maxSalary) return null;

        const currency = job.job_salary_currency || job.salary_currency || 'USD';
        const period = job.job_salary_period || 'year';

        if (minSalary && maxSalary) {
            return `${currency} ${minSalary.toLocaleString()}-${maxSalary.toLocaleString()}/${period}`;
        }
        if (minSalary) return `${currency} ${minSalary.toLocaleString()}+/${period}`;
        return `${currency} ${maxSalary.toLocaleString()}/${period}`;
    }, []);

    return {
        formFields,
        results,
        loading,
        cooldown,
        cooldownTimer,
        handleFieldChange,
        handleSearch,
        formatSalary,
    };
};

export default useJSearchLive;
