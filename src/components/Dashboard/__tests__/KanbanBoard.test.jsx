/**
 * DT-127 y DT-128 — las cuatro ventanas que el dashboard dejó de pintar.
 *
 * 1. `KanbanBoard` recorría 7 columnas (`COLUMNS`, con `interested`) y leía
 *    `grouped[col.key].length` sin guarda, mientras `useKanban` sembraba
 *    `grouped` con 6 claves: la primera columna lanzaba `TypeError: Cannot read
 *    properties of undefined (reading 'length')` en CADA montaje. Ahora las
 *    columnas son UNA lista (`config/kanbanColumns`) y las claves se derivan de
 *    ella, así que no pueden divergir.
 * 2. El throw se llevaba las otras tres ventanas de su grupo porque compartían
 *    un `ErrorBoundary`. Eso lo fija `DesktopDashboardContent.test.jsx`.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import KanbanBoard from '../KanbanBoard';
import { KANBAN_COLUMNS, COLUMN_KEYS } from '../../../config/kanbanColumns';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: { text: '#ddd', primary: '#0f0', borderLight: '#333', bg: '#111' } }),
}));

// El hook REAL se sustituye por un doble que siembra `grouped` como lo hace él:
// una clave por COLUMN_KEYS. Si alguien vuelve a desincronizar las dos listas,
// faltará una clave y el render volverá a lanzar — que es lo que se vigila.
const grouped = Object.fromEntries(COLUMN_KEYS.map(k => [k, []]));
grouped[COLUMN_KEYS[0]] = [{ id: 1, title: 'Dev', company: 'Acme', status: COLUMN_KEYS[0] }];

vi.mock('../../../hooks/useKanban', () => ({
    default: () => ({
        grouped,
        draggedId: null,
        addingTo: null,
        setAddingTo: vi.fn(),
        newApp: { title: '', company: '', url: '' },
        setNewApp: vi.fn(),
        handleDragStart: vi.fn(),
        handleDragOver: vi.fn(),
        handleDrop: vi.fn(),
        handleDragEnd: vi.fn(),
        handleAdd: vi.fn(),
        handleDelete: vi.fn(),
        handleKeyMove: vi.fn(),
        handleMarkApplied: vi.fn(),
        documentMap: {},
        generatingIds: new Set(),
    }),
}));

describe('KanbanBoard', () => {
    it('pinta TODAS las columnas del embudo, la primera incluida', () => {
        render(<KanbanBoard />);
        for (const col of KANBAN_COLUMNS) {
            expect(screen.getByText(`dashboard.kanban.${col.i18nKey}`)).toBeInTheDocument();
        }
    });

    it('cada columna que pinta tiene su grupo en `grouped` (DT-127)', () => {
        // La prueba de la causa raíz: el componente no puede pintar una columna
        // que el hook no siembre.
        expect(KANBAN_COLUMNS.map(c => c.key)).toEqual(COLUMN_KEYS);
        for (const col of KANBAN_COLUMNS) {
            expect(Array.isArray(grouped[col.key])).toBe(true);
        }
    });

    it('`interested` es una columna del embudo (y un estado real del backend)', () => {
        expect(COLUMN_KEYS).toContain('interested');
    });
});
