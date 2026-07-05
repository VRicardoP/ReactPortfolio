import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import FloatingWindow from '../Windows/FloatingWindow';
import '../../styles/dashboard-schools.css';

const PUSH_THRESHOLD = 70;
const DIGEST_THRESHOLD = 40;

// role_score viene como string Decimal del backend (-1.00 .. 1.00).
const ROLE_MATCH = 1.0;
const ROLE_PARTIAL = 0.5;
const ROLE_IRRELEVANT = 0.0;
const ROLE_EXCLUDED = -1.0;

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

const roleScoreNum = (v) => (v == null ? 0 : Number(v));
const roleColor = (score) => {
    if (score >= ROLE_MATCH) return '#4caf50'; // verde — IT match
    if (score >= ROLE_PARTIAL) return '#26a69a'; // teal — partial
    if (score <= ROLE_EXCLUDED) return '#9e9e9e'; // gris — docente excluido
    return '#bdbdbd'; // gris claro — irrelevante
};
const roleLabel = (t, score) => {
    if (score >= ROLE_MATCH) return t('dashboard.schoolJobs.relevance.match');
    if (score >= ROLE_PARTIAL) return t('dashboard.schoolJobs.relevance.partial');
    if (score <= ROLE_EXCLUDED) return t('dashboard.schoolJobs.relevance.excluded');
    return t('dashboard.schoolJobs.relevance.irrelevant');
};

const buildApplyLink = (school) => {
    if (school?.contact_email) {
        return `mailto:${school.contact_email}?subject=${encodeURIComponent('Spontaneous application — IT role')}`;
    }
    return school?.portal_url || school?.jobs_page_url || null;
};

const SchoolJobsWindow = memo(({ initialPosition, schoolData }) => {
    const { t } = useTranslation();
    const { schools, jobs, loading, error, refreshing, triggerScrape, refresh } = schoolData;

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
            <div className="school-jobs">
                <div className="school-jobs-toolbar">
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
                    <span className="school-jobs-count">
                        {t('dashboard.schoolJobs.count', { count: jobs.length })}
                    </span>
                </div>

                <div className="school-jobs-scroll">
                    {error && (
                        <div className="school-error">
                            {t('dashboard.schoolJobs.error', { message: error })}
                        </div>
                    )}

                    {!error && loading && (
                        <div className="school-msg">
                            {t('dashboard.schoolJobs.loading')}
                        </div>
                    )}

                    {!error && !loading && jobs.length === 0 && (
                        <div className="school-msg">
                            {t('dashboard.schoolJobs.noJobs')}
                        </div>
                    )}

                    {!error && jobs.length > 0 && (
                        <table className="visitors-table school-table">
                            <thead>
                                <tr>
                                    <th>{t('dashboard.schoolJobs.cols.relevance')}</th>
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
                                    const rscore = roleScoreNum(job.role_score);
                                    return (
                                        <tr
                                            key={job.id}
                                            className={rscore < ROLE_PARTIAL ? 'school-job-row--dimmed' : undefined}
                                        >
                                            <td>
                                                <span
                                                    className="school-badge school-badge--relevance"
                                                    style={{ background: roleColor(rscore) }}
                                                >
                                                    {roleLabel(t, rscore)}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className="school-badge school-badge--urgency"
                                                    style={{ background: urgencyColor(job.urgency_score) }}
                                                >
                                                    {job.urgency_score}
                                                </span>
                                                <div className="school-cell-sub">
                                                    {urgencyLabel(t, job.urgency_score)}
                                                </div>
                                            </td>
                                            <td>
                                                {school?.name || job.school_id}
                                                <div className="school-cell-sub">
                                                    {school?.policy}
                                                </div>
                                            </td>
                                            <td>{job.title}</td>
                                            <td>{new Date(job.date_detected).toLocaleString()}</td>
                                            <td>
                                                {job.url && (
                                                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="school-action-link">
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
