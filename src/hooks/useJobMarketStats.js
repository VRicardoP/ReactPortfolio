import { useMemo } from 'react';

import { JOB_SOURCES } from '../config/jobSources';

const SALARY_BUCKETS = [
    { label: '<50k', min: 0, max: 50000 },
    { label: '50-75k', min: 50000, max: 75000 },
    { label: '75-100k', min: 75000, max: 100000 },
    { label: '100-150k', min: 100000, max: 150000 },
    { label: '150k+', min: 150000, max: Infinity },
];

const getMidSalary = (job) => {
    const minSalary = job.salaryMin || 0;
    const maxSalary = job.salaryMax || 0;
    if (minSalary > 0 && maxSalary > 0) return (minSalary + maxSalary) / 2;
    return minSalary || maxSalary;
};

const chartDataset = (theme, label, data, backgroundColor) => ({
    label,
    data,
    backgroundColor,
    borderColor: theme.primary,
    borderWidth: 1,
});

// Agrega las ofertas y prepara todos los datasets de mercado y salario.
const useJobMarketStats = (jobData, theme, t) => {
    const allJobs = useMemo(() => {
        if (!jobData) return [];
        return JOB_SOURCES.flatMap(({ key }) => (
            (jobData[key]?._normalized || []).map(job => ({
                ...job,
                source: key.charAt(0).toUpperCase() + key.slice(1),
            }))
        ));
    }, [jobData]);

    const jobsWithSalary = useMemo(() => allJobs.filter(job => (
        (job.salaryMin || 0) > 0 || (job.salaryMax || 0) > 0
    )), [allJobs]);

    const primaryFill = `rgba(${theme.primaryRgb}, 0.6)`;

    const skillsChartData = useMemo(() => {
        const counts = {};
        for (const job of allJobs) {
            for (const skill of job.tags) {
                const key = skill.trim();
                if (key) counts[key] = (counts[key] || 0) + 1;
            }
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        return {
            labels: sorted.map(([name]) => name),
            datasets: [chartDataset(
                theme,
                t('dashboard.jobAnalytics.topSkills'),
                sorted.map(([, count]) => count),
                primaryFill,
            )],
        };
    }, [allJobs, primaryFill, theme, t]);

    const remoteChartData = useMemo(() => {
        let remote = 0;
        let onsite = 0;
        for (const job of allJobs) job.remote ? remote++ : onsite++;
        return {
            labels: [t('dashboard.jobBoard.remote'), t('dashboard.jobBoard.onsite')],
            datasets: [{
                data: [remote, onsite],
                backgroundColor: [primaryFill, theme.error],
                borderColor: [theme.primary, theme.error],
                borderWidth: 1,
            }],
        };
    }, [allJobs, primaryFill, theme, t]);

    const sourceChartData = useMemo(() => {
        const counts = {};
        for (const job of allJobs) counts[job.source] = (counts[job.source] || 0) + 1;
        const labels = Object.keys(counts);
        return {
            labels,
            datasets: [chartDataset(
                theme,
                t('dashboard.jobAnalytics.jobsBySource'),
                labels.map(label => counts[label]),
                labels.map((_, index) => theme.chartColors[index] || primaryFill),
            )],
        };
    }, [allJobs, primaryFill, theme, t]);

    const rangesChartData = useMemo(() => {
        const counts = SALARY_BUCKETS.map(() => 0);
        for (const job of jobsWithSalary) {
            const midpoint = getMidSalary(job);
            const index = SALARY_BUCKETS.findIndex(bucket => (
                midpoint >= bucket.min && midpoint < bucket.max
            ));
            if (index >= 0) counts[index]++;
        }
        return {
            labels: SALARY_BUCKETS.map(bucket => bucket.label),
            datasets: [chartDataset(
                theme,
                t('dashboard.salary.jobCount'),
                counts,
                primaryFill,
            )],
        };
    }, [jobsWithSalary, primaryFill, theme, t]);

    const averageChart = (keySelector, colors) => {
        const grouped = {};
        for (const job of jobsWithSalary) {
            const key = keySelector(job) || 'Unknown';
            if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
            grouped[key].total += getMidSalary(job);
            grouped[key].count++;
        }
        const labels = Object.keys(grouped).sort();
        return {
            labels,
            datasets: [chartDataset(
                theme,
                t('dashboard.salary.avgSalary'),
                labels.map(label => Math.round(grouped[label].total / grouped[label].count)),
                colors(labels),
            )],
        };
    };

    const byTypeChartData = useMemo(() => (
        averageChart(job => job.employmentType, () => primaryFill)
        // `averageChart` depends only on the values listed below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [jobsWithSalary, primaryFill, theme, t]);

    const bySourceChartData = useMemo(() => (
        averageChart(
            job => job.publisher || job.source,
            labels => labels.map((_, index) => theme.chartColors[index] || primaryFill),
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [jobsWithSalary, primaryFill, theme, t]);

    return {
        allJobs,
        jobsWithSalary,
        skillsChartData,
        remoteChartData,
        sourceChartData,
        rangesChartData,
        byTypeChartData,
        bySourceChartData,
    };
};

export default useJobMarketStats;
