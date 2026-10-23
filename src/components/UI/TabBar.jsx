import { memo } from 'react';

const NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);

const TabBar = memo(({
    tabs,
    active,
    onChange,
    ariaLabel,
    className,
    style,
    tabClassName,
    activeClassName = 'active',
}) => {
    const handleKeyDown = (event) => {
        if (!NAVIGATION_KEYS.has(event.key)) return;
        const enabled = tabs.filter(tab => !tab.disabled);
        if (enabled.length === 0) return;
        const currentIndex = Math.max(0, enabled.findIndex(tab => tab.key === active));
        let nextIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = enabled.length - 1;
        else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabled.length;
        else nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;

        event.preventDefault();
        onChange(enabled[nextIndex].key);
        const buttons = event.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)');
        buttons[nextIndex]?.focus();
    };

    return (
        <div className={className} style={style} role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.key}
                    tabIndex={active === tab.key ? 0 : -1}
                    disabled={tab.disabled}
                    title={tab.title}
                    id={tab.id}
                    aria-controls={tab.controls}
                    className={`${tabClassName || ''}${active === tab.key ? ` ${activeClassName}` : ''}${tab.disabled ? ' disabled' : ''}`.trim()}
                    onClick={() => onChange(tab.key)}
                    style={{ '--tab-color': tab.color, ...tab.style }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
});

TabBar.displayName = 'TabBar';

export default TabBar;
