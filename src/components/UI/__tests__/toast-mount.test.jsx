/**
 * DT-183: los avisos flotantes se montan UNA sola vez en `main.jsx`.
 *
 * El panel de escritorio (`/dashboard`) se había quedado sin montar `<Toast />`:
 * solo lo hacían `App.jsx` y el layout móvil. Resultado: todos los `showToast`
 * de Kanban, búsquedas guardadas, avisos en directo y gestión de ventanas se
 * perdían en silencio en escritorio.
 *
 * Lo que se fija aquí es la causa, no el síntoma: que ninguna página vuelva a
 * montar su propia copia (dos copias mostrarían cada aviso dos veces) y que el
 * árbol que envuelve TODAS las rutas sí lo monte.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import Toast, { showToast } from '../Toast';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('DT-183 · montaje de los avisos', () => {
  it('main.jsx monta Toast para todas las rutas', () => {
    const main = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf8');
    expect(main).toMatch(/<Toast\s*\/>/);
    // Fuera de <Routes>, para que valga igual en portfolio, login y panel.
    expect(main.indexOf('<Toast />')).toBeGreaterThan(main.indexOf('</Routes>'));
  });

  it('ninguna página ni layout monta su propia copia', () => {
    const sospechosos = [
      'App.jsx',
      'pages/DashboardPage.jsx',
      'pages/LoginPage.jsx',
      'components/Dashboard/MobileDashboardLayout.jsx',
      'components/Dashboard/DesktopDashboardContent.jsx',
    ];
    for (const rel of sospechosos) {
      const texto = fs.readFileSync(path.join(SRC, rel), 'utf8');
      expect(texto, `${rel} no debe montar <Toast />`).not.toMatch(/<Toast\s*\/>/);
    }
  });

  it('un aviso lanzado desde cualquier sitio se pinta', async () => {
    render(<Toast />);
    await act(async () => {
      showToast('Guardado');
    });
    expect(screen.getByText('Guardado')).toBeInTheDocument();
  });
});
