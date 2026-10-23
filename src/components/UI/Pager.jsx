import { memo } from 'react';

const Pager = memo(({
    page,
    totalPages,
    onPageChange,
    previousLabel = '<',
    nextLabel = '>',
    pageLabel,
    summary,
    className,
    controlsClassName,
    buttonClassName,
    pageClassName,
    style,
    buttonStyle,
}) => (
    <div className={className} style={style}>
        {summary}
        {totalPages > 1 && (
            <div className={controlsClassName}>
                <button
                    type="button"
                    className={buttonClassName}
                    style={buttonStyle}
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                >
                    {previousLabel}
                </button>
                <span className={pageClassName}>{pageLabel ?? `${page + 1}/${totalPages}`}</span>
                <button
                    type="button"
                    className={buttonClassName}
                    style={buttonStyle}
                    disabled={page >= totalPages - 1}
                    onClick={() => onPageChange(page + 1)}
                >
                    {nextLabel}
                </button>
            </div>
        )}
    </div>
));

Pager.displayName = 'Pager';

export default Pager;
