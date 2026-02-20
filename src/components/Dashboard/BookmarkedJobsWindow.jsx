import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from '../Windows/FloatingWindow';

const BookmarkedJobsWindow = memo(({ bookmarks, onRemove, initialPosition }) => {
    const { t } = useTranslation();

    const handleRemove = useCallback((id) => {
        onRemove(id);
    }, [onRemove]);

    return (
        <FloatingWindow
            id="bookmarked-jobs-window"
            title={t('dashboard.bookmarks.title')}
            initialPosition={initialPosition}
            initialSize={{ width: 500, height: 400 }}
        >
            <div className="jobboard-container">
                {bookmarks.length === 0 ? (
                    <div className="jobboard-empty">
                        {t('dashboard.bookmarks.empty')}
                    </div>
                ) : (
                    <div className="jobboard-list">
                        {bookmarks.map(job => (
                            <div key={job.id} className="jobboard-card bookmarked-card">
                                <div className="jobboard-card-header">
                                    <h3 className="jobboard-title">{job.title}</h3>
                                    <span className="jobboard-type">{job.source}</span>
                                </div>

                                <div className="jobboard-company">{job.company}</div>

                                <div className="jobboard-card-footer">
                                    <span className="jobboard-date">
                                        {new Date(job.savedAt).toLocaleDateString()}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="jobboard-clear-btn"
                                            onClick={() => handleRemove(job.id)}
                                        >
                                            {t('dashboard.bookmarks.remove')}
                                        </button>
                                        {job.url && (
                                            <a
                                                href={job.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="jobboard-apply-btn"
                                            >
                                                {t('dashboard.jobBoard.apply')}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </FloatingWindow>
    );
});

BookmarkedJobsWindow.displayName = 'BookmarkedJobsWindow';

export default BookmarkedJobsWindow;
