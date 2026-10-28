// Ventana del portfolio que muestra las habilidades "blandas" (como
// trabajo en equipo, comunicación) en tarjetas con un icono corto y su nombre.

import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';
import { WINDOW_SIZES } from '../../config/windowSizes';

// Traduce los emojis de una versión antigua de los datos a una etiqueta de
// texto corta, para los casos en que el icono guardado ya no es válido.
const LEGACY_ICON_LABELS = {
    '\u{1F3AF}': 'AIM',
    '\u{1F680}': 'GO',
    '\u{1F4AC}': 'COM',
    '\u{1F527}': 'FIX',
    '\u{1F4DD}': 'DOC',
    '\u{1F4DA}': 'EDU',
    '⭐': 'OWN',
    '\u{1F3E0}': 'REM',
    '\u{1F9D8}': 'CALM',
};

// Decide qué etiqueta de icono mostrar para una habilidad: la traducción
// de un emoji antiguo, el texto si ya es una etiqueta válida, o una por defecto.
const iconLabel = (icon) => {
    if (LEGACY_ICON_LABELS[icon]) return LEGACY_ICON_LABELS[icon];
    return /^[A-Z0-9]{1,5}$/.test(icon || '') ? icon : 'SKL';
};

const SoftSkillsWindow = ({ data, initialPosition, defaultExpanded }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="soft-skills-window"
            title={t('windows.softSkills')}
            initialPosition={initialPosition}
            initialSize={WINDOW_SIZES.softSkills}
            defaultExpanded={defaultExpanded}
        >
            <div className="soft-skills-content">
                <div className="soft-skills-grid">
                    {data.softSkills.map((skill, index) => {
                        const text = typeof skill === 'string' ? skill : skill.text;
                        const icon = typeof skill === 'string' ? 'SKL' : iconLabel(skill.icon);

                        return (
                            <div className="soft-skill-card" key={`${text}-${index}`}>
                                <span className="soft-skill-icon" aria-hidden="true">{icon}</span>
                                <span className="soft-skill-name">{text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </FloatingWindow>
    );
};

export default SoftSkillsWindow;
