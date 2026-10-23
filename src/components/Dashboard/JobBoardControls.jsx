// Barra de controles que comparten los tableros de ofertas: el selector de
// orden, cuántas ofertas se están mostrando, la edad de la caché, y los
// botones de página anterior/siguiente.

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import Pager from '../UI/Pager';

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

            <Pager
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
                previousLabel={t('dashboard.jobBoard.prev')}
                nextLabel={t('dashboard.jobBoard.next')}
                pageLabel={t('dashboard.jobBoard.page', { page: page + 1, pages: totalPages })}
                className="jobboard-pagination"
                buttonClassName="jobboard-page-btn"
                pageClassName="jobboard-page-info"
            />
        </>
    );
});

JobBoardControls.displayName = 'JobBoardControls';

export default JobBoardControls;
