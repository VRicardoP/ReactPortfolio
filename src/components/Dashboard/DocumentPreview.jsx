import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/document-preview.css';

const CvContent = memo(({ data }) => {
    const { t } = useTranslation();
    return (
        <div className="cv-preview">
            {data.summary && (
                <section className="cv-preview-section">
                    <h3>{t('dashboard.cvGeneration.summary')}</h3>
                    <p>{data.summary}</p>
                </section>
            )}
            {data.highlighted_skills?.length > 0 && (
                <section className="cv-preview-section">
                    <h3>{t('dashboard.cvGeneration.skills')}</h3>
                    <div className="cv-preview-skills">
                        {data.highlighted_skills.map((skill, i) => (
                            <span key={i} className="cv-preview-skill-tag">{skill}</span>
                        ))}
                    </div>
                </section>
            )}
            {data.experience?.length > 0 && (
                <section className="cv-preview-section">
                    <h3>{t('dashboard.cvGeneration.experience')}</h3>
                    {data.experience.map((exp, i) => (
                        <div key={i} className="cv-preview-entry">
                            <strong>{exp.title}</strong> — {exp.company}
                            <span className="cv-preview-date">{exp.date}</span>
                            <p>{exp.description}</p>
                        </div>
                    ))}
                </section>
            )}
            {data.key_match_points?.length > 0 && (
                <section className="cv-preview-section">
                    <h3>{t('dashboard.cvGeneration.matchPoints')}</h3>
                    <ul>
                        {data.key_match_points.map((point, i) => (
                            <li key={i}>{point}</li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
});

CvContent.displayName = 'CvContent';

const CoverLetterContent = memo(({ data }) => (
    <div className="cv-preview cover-letter-preview">
        <p className="cl-greeting">{data.greeting}</p>
        <p>{data.opening_paragraph}</p>
        {data.body_paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
        ))}
        <p>{data.closing_paragraph}</p>
        <div className="cl-signature">
            <strong>{data.candidate_name}</strong>
            <br />
            {data.candidate_contact}
        </div>
    </div>
));

CoverLetterContent.displayName = 'CoverLetterContent';

const DocumentPreview = memo(({
    documents,
    onDownloadPdf,
    onDownloadJson,
    onRegenerate,
    applicationId,
    onClose,
}) => {
    const { t } = useTranslation();
    const [activeDocTab, setActiveDocTab] = useState('cv');

    if (!documents) {
        return (
            <div className="cv-gen-doc-panel">
                <div className="cv-gen-doc-panel-header">
                    <span>{t('dashboard.cvGeneration.title')}</span>
                    <button className="cv-gen-btn-small cv-gen-btn-cancel" onClick={onClose}>✕</button>
                </div>
                <div className="jobboard-empty">
                    {t('dashboard.cvGeneration.noDocuments')}
                </div>
            </div>
        );
    }

    const activeDoc = activeDocTab === 'cv' ? documents.cv : documents.coverLetter;
    const content = activeDoc ? JSON.parse(activeDoc.content) : null;

    return (
        <div className="cv-gen-doc-panel">
            <div className="cv-gen-doc-panel-header">
                <div className="cv-gen-tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
                    <button
                        className={`cv-gen-tab${activeDocTab === 'cv' ? ' active' : ''}`}
                        onClick={() => setActiveDocTab('cv')}
                    >
                        {t('dashboard.cvGeneration.tabCv')}
                    </button>
                    <button
                        className={`cv-gen-tab${activeDocTab === 'coverLetter' ? ' active' : ''}`}
                        onClick={() => setActiveDocTab('coverLetter')}
                    >
                        {t('dashboard.cvGeneration.tabCoverLetter')}
                    </button>
                </div>
                <button className="cv-gen-btn-small cv-gen-btn-cancel" onClick={onClose}>✕</button>
            </div>

            <div className="cv-gen-preview-content">
                {content ? (
                    activeDocTab === 'cv'
                        ? <CvContent data={content} />
                        : <CoverLetterContent data={content} />
                ) : (
                    <div className="jobboard-empty">
                        {t('dashboard.cvGeneration.noDocuments')}
                    </div>
                )}
            </div>

            {activeDoc && (
                <div className="cv-gen-download-bar">
                    <button
                        className="cv-gen-btn cv-gen-btn-download"
                        onClick={() => onDownloadPdf(
                            activeDoc.id,
                            activeDocTab === 'cv' ? 'cv_adapted.pdf' : 'cover_letter.pdf'
                        )}
                    >
                        {t('dashboard.cvGeneration.downloadPdf')}
                    </button>
                    <button
                        className="cv-gen-btn cv-gen-btn-download"
                        onClick={() => onDownloadJson(
                            activeDoc.id,
                            activeDocTab === 'cv' ? 'cv_adapted.json' : 'cover_letter.json'
                        )}
                    >
                        {t('dashboard.cvGeneration.downloadJson')}
                    </button>
                    <button
                        className="cv-gen-btn cv-gen-btn-generate"
                        onClick={() => onRegenerate(applicationId)}
                    >
                        {t('dashboard.cvGeneration.regenerate')}
                    </button>
                </div>
            )}
        </div>
    );
});

DocumentPreview.displayName = 'DocumentPreview';

export default DocumentPreview;
