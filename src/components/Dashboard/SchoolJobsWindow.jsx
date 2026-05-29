import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import FloatingWindow from '../Windows/FloatingWindow';
import useSchoolJobs from '../../hooks/useSchoolJobs';

const PUSH_THRESHOLD = 70;
const DIGEST_THRESHOLD = 40;

const urgencyColor = (score) => {
    if (score >= PUSH_THRESHOLD) return '#ff5252'; // red — act now
    if (score >= DIGEST_THRESHOLD) return '#ffb74d'; // amber — digest
    return '#9e9e9e'; // silent
};

const urgencyLabel = (t, score) => {
    if (score >= PUSH_THRESHOLD) return t('dashboard.schoolJobs.urgency.push');
    if (score >= DIGEST_THRESHOLD) return t('dashboard.schoolJobs.urgency.digest');
    return t('dashboard.schoolJobs.urgency.silent');
};

const buildApplyLink = (school) => {
    if (school?.contact_email) {
        return `mailto:${school.contact_email}?subject=${encodeURIComponent('Spontaneous application — IT role')}`;
    }
    return school?.portal_url || school?.jobs_page_url || null;
};

const SchoolJobsWindow = memo(({ initialPosition }) => {
    const { t } = useTranslation();
    const { schools, jobs, loading, error, refreshing, triggerScrape, refresh } = useSchoolJobs();

    const schoolsById = useMemo(() => {
        const map = {};
        for (const s of schools) map[s.id] = s;
        return map;
    }, [schools]);

    return (
        <FloatingWindow
            id="school-jobs-window"
            title={t('dashboard.schoolJobs.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 820, height: 480 }}
        >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--theme-border-light)' }}>
                    <button
                        className="dash-btn"
                        onClick={triggerScrape}
                        disabled={refreshing || loading}
                    >
                        {refreshing ? t('dashboard.schoolJobs.scraping') : t('dashboard.schoolJobs.scrapeNow')}
                    </button>
                    <button
                        className="dash-btn"
                        onClick={refresh}
                        disabled={loading}
                    >
                        {t('dashboard.schoolJobs.reload')}
                    </button>
                    <span style={{ marginLeft: 'auto', color: 'var(--theme-text)', opacity: 0.7 }}>
                        {t('dashboard.schoolJobs.count', { count: jobs.length })}
                    </span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {error && (
                        <div style={{ padding: 16, color: '#ff5252' }}>
                            {t('dashboard.schoolJobs.error', { message: error })}
                        </div>
                    )}

                    {!error && loading && (
                        <div style={{ padding: 16, color: 'var(--theme-text)', opacity: 0.6 }}>
                            {t('dashboard.schoolJobs.loading')}
                        </div>
                    )}

                    {!error && !loading && jobs.length === 0 && (
                        <div style={{ padding: 16, color: 'var(--theme-text)', opacity: 0.6 }}>
                            {t('dashboard.schoolJobs.noJobs')}
                        </div>
                    )}

                    {!error && jobs.length > 0 && (
                        <table className="visitors-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>{t('dashboard.schoolJobs.cols.urgency')}</th>
                                    <th>{t('dashboard.schoolJobs.cols.school')}</th>
                                    <th>{t('dashboard.schoolJobs.cols.title')}</th>
                                    <th>{t('dashboard.schoolJobs.cols.detected')}</th>
                                    <th>{t('dashboard.schoolJobs.cols.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((job) => {
                                    const school = schoolsById[job.school_id];
                                    const link = buildApplyLink(school);
                                    return (
                                        <tr key={job.id}>
                                            <td>
                                                <span style={{
                                                    display: 'inline-block',
                                                    minWidth: 40,
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    background: urgencyColor(job.urgency_score),
                                                    color: '#fff',
                                                    fontWeight: 'bold',
                                                    textAlign: 'center',
                                                }}>
                                                    {job.urgency_score}
                                                </span>
                                                <div style={{ fontSize: 11, opacity: 0.7 }}>
                                                    {urgencyLabel(t, job.urgency_score)}
                                                </div>
                                            </td>
                                            <td>
                                                {school?.name || job.school_id}
                                                <div style={{ fontSize: 11, opacity: 0.7 }}>
                                                    {school?.policy}
                                                </div>
                                            </td>
                                            <td>{job.title}</td>
                                            <td>{new Date(job.date_detected).toLocaleString()}</td>
                                            <td>
                                                {job.url && (
                                                    <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8 }}>
                                                        {t('dashboard.schoolJobs.viewOffer')}
                                                    </a>
                                                )}
                                                {link && (
                                                    <a href={link} target="_blank" rel="noopener noreferrer">
                                                        {school?.contact_email
                                                            ? t('dashboard.schoolJobs.emailContact')
                                                            : t('dashboard.schoolJobs.openPortal')}
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </FloatingWindow>
    );
});

SchoolJobsWindow.displayName = 'SchoolJobsWindow';

export default SchoolJobsWindow;
