/**
 * DT-208: las ventanas que el diseño compacto monta con `defaultExpanded`
 * tienen que reenviar la prop a FloatingWindow. Las nueve del portfolio la
 * tiraban en silencio (`({ data, initialPosition })`), así que Perfil,
 * Experiencia y Contacto arrancaban cerradas aunque App.jsx pidiera lo
 * contrario — el mismo fallo que ya tuvieron cinco ventanas del panel.
 *
 * Guarda mecánica, como key-coverage.test.js: lee el fuente y comprueba el
 * reenvío literal. Solo cubre las ventanas que reciben la prop de verdad.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const WINDOWS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Las que MobilePortfolioLayout (App.jsx) monta como secciones.
const PORTFOLIO_SECTIONS = [
    'ProfileWindow', 'ExperienceWindow', 'TechSkillsWindow', 'EducationWindow',
    'PortfolioWindow', 'SoftSkillsWindow', 'LanguagesWindow', 'AchievementsWindow',
    'ContactWindow',
];

describe('DT-208 · reenvío de defaultExpanded en las secciones del portfolio', () => {
    it.each(PORTFOLIO_SECTIONS)('%s reenvía defaultExpanded a FloatingWindow', (name) => {
        const source = fs.readFileSync(path.join(WINDOWS_DIR, `${name}.jsx`), 'utf8');
        expect(source).toContain('defaultExpanded={defaultExpanded}');
    });
});
