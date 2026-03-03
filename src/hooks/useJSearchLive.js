import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';
import { showToast } from '../components/UI/Toast';

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
const useJSearchLive = () => {
    const { t } = useTranslation();
    const { authenticatedFetch } = useAuth();

    const [formFields, setFormFields] = useState(INITIAL_FORM_FIELDS);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(false);
    const [cooldownTimer, setCooldownTimer] = useState(0);
    const timerRef = useRef(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

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

    const handleFieldChange = useCallback((field, value) => {
        setFormFields(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSearch = useCallback(async () => {
        if (cooldown || !formFields.query.trim()) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('q', formFields.query.trim());
            if (formFields.country) params.set('country', formFields.country);
            if (formFields.date_posted !== 'all') params.set('date_posted', formFields.date_posted);
            if (formFields.employment_type !== 'all') params.set('employment_type', formFields.employment_type);
            if (formFields.remote_only) params.set('remote_only', 'true');

            const response = await authenticatedFetch(`${BACKEND_URL}/api/v1/jsearch-jobs/search?${params.toString()}`);
            const data = await response.json();
            setResults(Array.isArray(data) ? data : data.data || data.results || data.jobs || []);
            startCooldown();
        } catch {
            setResults([]);
            showToast(t('dashboard.jsearchLive.errorSearch'));
        } finally {
            setLoading(false);
        }
    }, [authenticatedFetch, formFields, cooldown, startCooldown, t]);

    /**
     * Format salary range from a job object's salary fields.
     * @param {Object} job — job object with optional salary fields
     * @returns {string|null} formatted salary string or null
     */
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
