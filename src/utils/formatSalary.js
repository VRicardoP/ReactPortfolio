export const formatFilterSalary = (min, max, currency) => {
    const cur = currency || 'USD';
    if (min && max) return `${cur} ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
    if (min) return `${cur} ${Number(min).toLocaleString()}+`;
    if (max) return `${cur} <=${Number(max).toLocaleString()}`;
    return '';
};

export const formatJobSalary = (job) => {
    const min = job.job_min_salary || job.min_salary;
    const max = job.job_max_salary || job.max_salary;
    if (!min && !max) return null;

    const currency = job.job_salary_currency || job.salary_currency || 'USD';
    const period = job.job_salary_period || 'year';
    if (min && max) return `${currency} ${min.toLocaleString()}-${max.toLocaleString()}/${period}`;
    if (min) return `${currency} ${min.toLocaleString()}+/${period}`;
    return `${currency} ${max.toLocaleString()}/${period}`;
};
