import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
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
    formatSalary,
    translatedTitle,
    expanded = false,
    onToggle,
}) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    if (variant === 'match') {
        const title = job.title_en || translatedTitle || job.title;
        return (
            <article className="ai-match-card" style={{ border: `1px solid ${theme.borderLight}` }}>
                <div className="ai-match-card-header">
                    <div className="ai-match-card-title-col">
                        <div className="ai-match-card-title" style={{ color: theme.textHighlight }}>
                            {title}
                            {(job.title_en || translatedTitle) && <span className="ai-match-translated-badge" title={job.title}>{t('dashboard.aiMatch.translated')}</span>}
                        </div>
                        <div className="ai-match-card-company" style={{ color: theme.text }}><CompanyResearchName company={job.company}>{job.company}</CompanyResearchName></div>
                    </div>
                    <div className="ai-match-card-score-col">
                        <span className="ai-match-score" style={{ color: theme.primary }}>{job.ai_score}%</span>
                        <span className={`ai-match-fit-badge fit-${job.fit || 'unknown'}`}>{job.fit?.toUpperCase()}</span>
                    </div>
                </div>
                <div className="ai-match-card-meta">
                    {job.location && <span className="ai-match-card-meta-text" style={{ color: theme.text }}>{job.location}</span>}
                    <JobBadges remote={job.remote} source={job.source} employmentType={job.employment_type}
                        sourceStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', color: theme.primary, borderColor: `rgba(${theme.primaryRgb}, 0.3)` }}
                        employmentClassName="ai-match-card-meta-text secondary" employmentStyle={{ color: theme.text }} />
                </div>
                <JobSummary job={job} className="ai-match-summary" style={{ color: theme.text }} />
                <button className="ai-match-skills-toggle" style={{ color: theme.primary }} onClick={onToggle} aria-expanded={expanded}>
                    {t('dashboard.aiMatch.skillsAnalysis')} {expanded ? '-' : '+'}
                </button>
                {expanded && (
                    <div className="ai-match-skills-detail">
                        {job.matching_skills?.length > 0 && <div className="ai-match-skills-group"><span className="ai-match-skills-label text-success">[OK] {t('dashboard.aiMatch.matchingSkills')}:</span><div className="ai-match-skills-tags">{job.matching_skills.map(skill => <span key={skill} className="ai-match-skill-tag-match">{skill}</span>)}</div></div>}
                        {job.missing_skills?.length > 0 && <div className="ai-match-skills-group"><span className="ai-match-skills-label text-danger">[X] {t('dashboard.aiMatch.missingSkills')}:</span><div className="ai-match-skills-tags">{job.missing_skills.map(skill => <span key={skill} className="ai-match-skill-tag-miss">{skill}</span>)}</div></div>}
                        {job.reason && <p className="ai-match-reason">{job.reason}</p>}
                    </div>
                )}
                <div className="ai-match-card-footer">
                    <JobDate date={job.date} className="ai-match-card-date" style={{ color: theme.text }} />
                    <div className="ai-match-card-actions">{actions}</div>
                </div>
            </article>
        );
    }
    if (variant === 'saved') {
        return (
            <article style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: theme.textHighlight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                    <div style={{ fontSize: '10px', color: theme.text, opacity: 0.7 }}>
                        <CompanyResearchName company={job.company}>{job.company}</CompanyResearchName>
                        {job.location ? ` — ${job.location}` : ''}
                        {(job.salary_min || job.salary_max) && (
                            <span className="job-card-salary">
                                {job.salary_currency || 'USD'} {job.salary_min ? Number(job.salary_min).toLocaleString() : '?'}
                                -{job.salary_max ? Number(job.salary_max).toLocaleString() : '?'}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontFamily: 'Courier New', background: `rgba(${theme.primaryRgb}, 0.1)`, color: theme.primary, border: `1px solid rgba(${theme.primaryRgb}, 0.2)` }}>{job.source}</span>
                    {actions}
                </div>
            </article>
        );
    }
    if (variant === 'live') {
        const title = job.job_title || job.title;
        const company = job.employer_name || job.employer;
        const remote = job.job_is_remote ?? job.is_remote;
        const city = job.job_city || job.city;
        const country = job.job_country || job.country;
        const employmentType = job.job_employment_type || job.employment_type;
        const publisher = job.job_publisher || job.publisher;
        const salary = formatSalary(job);
        return (
            <article className="jobboard-card jsearch-card">
                <div className="jobboard-card-header">
                    <div className="jsearch-title-row">
                        {job.employer_logo && <img src={job.employer_logo} alt={company} className="jsearch-logo" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                        <h3 className="jobboard-title">{title}</h3>
                    </div>
                    <span className={`jobboard-type ${remote ? 'jsearch-remote' : 'jsearch-onsite'}`}>
                        {remote ? t('dashboard.jobBoard.remote') : t('dashboard.jobBoard.onsite')}
                    </span>
                </div>
                <div className="jobboard-company">{company}</div>
                <div className="jobboard-meta">
                    <span className="jobboard-country">{city}{country ? ` (${country})` : ''}</span>
                    {employmentType && <span className="jobboard-industry">{employmentType}</span>}
                </div>
                {salary && <div className="jsearch-salary">{salary}</div>}
                {publisher && <div className="jsearch-source"><span className="jsearch-source-tag">{publisher}</span></div>}
                <div className="jobboard-card-footer">
                    <span className="jobboard-date">{job.job_posted_at || job.posted_at || t('dashboard.jobBoard.recently')}</span>
                    {actions}
                </div>
            </article>
        );
    }
    if (variant === 'filter') {
        return (
            <article style={{ padding: '8px 10px', border: `1px solid ${theme.borderLight}`, borderRadius: '4px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Courier New', fontSize: '13px', color: theme.textHighlight, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '11px', color: theme.text, marginTop: '2px' }}><CompanyResearchName company={job.company}>{job.company}</CompanyResearchName></div>
                    </div>
                    <JobBadges remote={job.remote} source={job.source} sourceStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', color: theme.primary, borderColor: `rgba(${theme.primaryRgb}, 0.3)` }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {job.location && <span style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.7 }}>{job.location}</span>}
                    {(job.salary_min || job.salary_max) && <span className="job-card-salary job-card-salary--compact">{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>}
                    <JobBadges employmentType={job.employment_type} employmentStyle={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.5 }} />
                </div>
                <Tags tags={job.tags} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <JobDate date={job.date} style={{ fontFamily: 'Courier New', fontSize: '10px', color: theme.text, opacity: 0.5 }} />
                    {actions}
                </div>
            </article>
        );
    }
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
