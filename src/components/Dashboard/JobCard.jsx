import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { CompanyResearchName, JobBadges, JobDate, JobSummary } from './JobCardExtras';

const Tags = ({ tags = [] }) => tags.length > 0 && (
    <div className="jobboard-skills">
        {tags.slice(0, 5).map(tag => <span key={tag} className="jobboard-skill-tag">{tag}</span>)}
        {tags.length > 5 && <span className="jobboard-skill-more">+{tags.length - 5}</span>}
    </div>
);

const JobCard = memo(({
    job,
    variant = 'board',
    actions,
    showSource = false,
    sourceStyle,
}) => {
    const { t } = useTranslation();
    if (variant !== 'board') return null;
    const title = job.title_en || job.title;

    return (
        <article className="jobboard-card">
            <div className="jobboard-card-header">
                <h3 className="jobboard-title">
                    {job.url ? (
                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                            className="jobboard-title-link" title={job.title_en ? job.title : undefined}>
                            {title}
                        </a>
                    ) : title}
                    {job.title_en && (
                        <span className="jobboard-translated-badge">{t('dashboard.aiMatch.translated')}</span>
                    )}
                </h3>
                <JobBadges
                    remote={job.remote}
                    source={showSource ? job.source : null}
                    employmentType={job.employmentType}
                    sourceStyle={sourceStyle}
                    employmentClassName="jobboard-type"
                />
            </div>
            <div className="jobboard-company">
                <CompanyResearchName company={job.company}>{job.company}</CompanyResearchName>
            </div>
            {job.location && <div className="jobboard-meta"><span className="jobboard-country">{job.location}</span></div>}
            <JobSummary job={job} className="jobboard-summary" />
            <Tags tags={job.tags} />
            <div className="jobboard-card-footer">
                <JobDate date={job.date} className="jobboard-date" />
                <div className="jobboard-card-btns">{actions}</div>
            </div>
        </article>
    );
});

JobCard.displayName = 'JobCard';

export default JobCard;
