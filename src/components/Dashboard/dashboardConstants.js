// Valores compartidos del panel de administración: cuántas ofertas se
// muestran por página, y las pestañas del menú en la versión móvil.

export const JOBS_PAGE_SIZE = 20;
export const AI_MATCH_PAGE_SIZE = 10;
export const STATS_WINDOW_DAYS = 30;
export const DASHBOARD_TITLE_TYPE_DELAY_MS = 100;

// Tab definitions for mobile dashboard layout
export const DASHBOARD_TABS = [
    { key: 'overview', icon: 'STAT' },
    { key: 'map', icon: 'MAP' },
    { key: 'chat', icon: 'CHAT' },
    { key: 'jobs', icon: 'JOBS' },
    { key: 'schools', icon: 'EDU' },
    { key: 'settings', icon: 'CFG' },
];
