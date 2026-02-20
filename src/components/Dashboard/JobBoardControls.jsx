import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const JobBoardControls = memo(({ sortBy, onSortChange, page, totalPages, from, to, total, onPageChange, cacheAge }) => {
    const { t } = useTranslation();

    return (
        <>
            {/* Sort + cache age row */}
            <div className="jobboard-controls">
                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="jobboard-select jobboard-sort"
                >
                    <option value="newest">{t('dashboard.jobBoard.sortNewest')}</option>
                    <option value="oldest">{t('dashboard.jobBoard.sortOldest')}</option>
                    <option value="company">{t('dashboard.jobBoard.sortCompany')}</option>
                    <option value="title">{t('dashboard.jobBoard.sortTitle')}</option>
                </select>

                <span className="jobboard-count">
                    {t('dashboard.jobBoard.showing', { from, to, total })}
                </span>

                {cacheAge && (
                    <span className="jobboard-cache-badge">
                        {cacheAge}
                    </span>
                )}
            </div>

            {/* Pagination - only if more than one page */}
            {totalPages > 1 && (
                <div className="jobboard-pagination">
                    <button
                        className="jobboard-page-btn"
                        disabled={page === 0}
                        onClick={() => onPageChange(page - 1)}
                    >
                        {t('dashboard.jobBoard.prev')}
                    </button>
                    <span className="jobboard-page-info">
                        {t('dashboard.jobBoard.page', { page: page + 1, pages: totalPages })}
                    </span>
                    <button
                        className="jobboard-page-btn"
                        disabled={page >= totalPages - 1}
                        onClick={() => onPageChange(page + 1)}
                    >
                        {t('dashboard.jobBoard.next')}
                    </button>
                </div>
            )}
        </>
    );
});

JobBoardControls.displayName = 'JobBoardControls';

export default JobBoardControls;
