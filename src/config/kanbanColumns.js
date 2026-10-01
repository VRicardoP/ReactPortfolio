/**
 * Columnas del pipeline de candidaturas — FUENTE ÚNICA (DT-127).
 *
 * Había dos listas: `COLUMNS` en `components/Dashboard/KanbanBoard.jsx` (7, con
 * `interested`) y `COLUMN_KEYS` en `hooks/useKanban.js` (6, sin ella). El
 * componente pintaba una columna que el hook no sembraba en `grouped`, así que
 * `grouped['interested'].length` lanzaba un TypeError en CADA montaje y el
 * ErrorBoundary del grupo se llevaba cuatro ventanas del dashboard. Con una
 * sola lista eso no puede volver a pasar: las claves se DERIVAN de las columnas.
 *
 * `key` es el valor REAL de `ApplicationStatus` del backend
 * (`backend/models/job_application.py`), y el orden es el del embudo: los saltos
 * de columna por teclado se mueven sobre este índice.
 */
export const KANBAN_COLUMNS = [
    // Primer paso del embudo. Antes no existía: por eso abrir una oferta se
    // registraba directamente como «aplicada», que era falso.
    { key: 'interested', i18nKey: 'interested', color: '#9C27B0' },
    { key: 'saved', i18nKey: 'saved', color: '#888888' },
    { key: 'applied', i18nKey: 'applied', color: '#4CAF50' },
    { key: 'phone_screen', i18nKey: 'phoneScreen', color: '#FF9800' },
    { key: 'technical', i18nKey: 'technical', color: '#2196F3' },
    { key: 'offer', i18nKey: 'offer', color: '#00BCD4' },
    { key: 'rejected', i18nKey: 'rejected', color: '#f44336' },
];

export const COLUMN_KEYS = KANBAN_COLUMNS.map(col => col.key);
