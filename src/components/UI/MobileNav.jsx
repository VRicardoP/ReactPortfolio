// Barra de navegación superior para móvil: muestra el título de la
// página y un botón que abre un pequeño menú con el Terminal, el cambio de
// tema de color y el interruptor del fondo animado ligero (DT-208: antes el
// visitante en móvil no podía cambiar ni el tema ni el fondo).

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/mobile.css';

const MobileNav = ({ title, onTerminalToggle }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const { t } = useTranslation();
    const { theme, cycleTheme, compactBackground, toggleCompactBackground } = useTheme();

    // Abre o cierra el menú desplegable.
    const handleToggleMenu = useCallback(() => {
        setMenuOpen(prev => !prev);
    }, []);

    // Cierra el menú y abre la ventana del Terminal.
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
                            {t('windows.controls.terminal')}
                        </button>
                        {/* El menú se queda abierto: así se puede pasar por los
                            tres temas seguidos viendo el cambio detrás. */}
                        <button
                            className="mobile-nav-dropdown-item"
                            onClick={cycleTheme}
                            role="menuitem"
                        >
                            <span
                                className="mobile-theme-swatch"
                                style={{ backgroundColor: theme.primary }}
                                aria-hidden="true"
                            />
                            {t('mobile.theme')}
                        </button>
                        <button
                            className="mobile-nav-dropdown-item"
                            onClick={toggleCompactBackground}
                            role="menuitemcheckbox"
                            aria-checked={compactBackground}
                        >
                            <span className="mobile-nav-dropdown-item-icon" aria-hidden="true">
                                {compactBackground ? 'ON' : 'OFF'}
                            </span>
                            {t('mobile.animatedBackground')}
                        </button>
                    </div>
                </>
            )}
        </nav>
    );
};

export default MobileNav;
