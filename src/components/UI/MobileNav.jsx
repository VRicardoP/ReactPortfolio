import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/mobile.css';

const MobileNav = ({ title, onTerminalToggle }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const { t } = useTranslation();

    const handleToggleMenu = useCallback(() => {
        setMenuOpen(prev => !prev);
    }, []);

    const handleTerminal = useCallback(() => {
        setMenuOpen(false);
        onTerminalToggle();
    }, [onTerminalToggle]);

    return (
        <nav className="mobile-nav-header">
            <span className="mobile-nav-title">{title}</span>
            <div className="mobile-nav-actions">
                <button
                    className="mobile-nav-btn"
                    onClick={handleToggleMenu}
                    aria-label={t('mobile.menu')}
                    aria-expanded={menuOpen}
                >
                    <span
                        className={menuOpen ? 'mobile-close-icon' : 'mobile-menu-icon'}
                        aria-hidden="true"
                    />
                </button>
            </div>

            {menuOpen && (
                <>
                    <div
                        className="mobile-nav-dropdown-overlay"
                        onClick={() => setMenuOpen(false)}
                    />
                    <div className="mobile-nav-dropdown" role="menu">
                        <button
                            className="mobile-nav-dropdown-item"
                            onClick={handleTerminal}
                            role="menuitem"
                        >
                            <span className="mobile-nav-dropdown-item-icon">{'>_'}</span>
                            Terminal
                        </button>
                    </div>
                </>
            )}
        </nav>
    );
};

export default MobileNav;
