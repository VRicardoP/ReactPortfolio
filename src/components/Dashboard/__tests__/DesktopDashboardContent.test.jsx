/**
 * DT-128 — un `ErrorBoundary` POR VENTANA, no por grupo.
 *
 * Antes las ventanas iban en cinco bloques y cada bloque compartía un
 * ErrorBoundary: el TypeError de `SelectedOffersPanel` (DT-127) hacía
 * desaparecer también Job Board, Job Search y AI Job Match, que funcionaban.
 * Medido en producción: 8 ventanas pintadas de 12.
 *
 * Aquí se fuerza el fallo de UNA ventana y se exige que las demás sigan.
 */
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

// `ErrorBoundary` importa `src/i18n`, que necesita `initReactI18next` del módulo
// real: se mockea PARCIALMENTE.
vi.mock('react-i18next', async importOriginal => ({
    ...(await importOriginal()),
    useTranslation: () => ({ t: key => key }),
}));
vi.mock('../../../hooks/useWindowLayout', () => ({ default: () => {} }));
vi.mock('../../../hooks/useSSENotifications', () => ({ useSSENotifications: () => ({}) }));
vi.mock('../../../hooks/useSchoolJobs', () => ({ default: () => ({ schools: [], jobs: [] }) }));

// La ventana que revienta es la MISMA que reventaba en producción.
vi.mock('../SelectedOffersPanel', () => ({
    default: () => {
        throw new TypeError("Cannot read properties of undefined (reading 'length')");
    },
}));

const stub = nombre => ({ default: () => <div>{nombre}</div> });
vi.mock('../StatsWindow', () => stub('StatsWindow'));
vi.mock('../MapWindow', () => stub('MapWindow'));
vi.mock('../ChatAnalyticsWindow', () => stub('ChatAnalyticsWindow'));
vi.mock('../RecentVisitorsWindow', () => stub('RecentVisitorsWindow'));
vi.mock('../JobBoardTabbedWindow', () => stub('JobBoardTabbedWindow'));
vi.mock('../JobMarketAnalyticsWindow', () => stub('JobMarketAnalyticsWindow'));
vi.mock('../JobSearchWindow', () => stub('JobSearchWindow'));
vi.mock('../AIJobMatchWindow', () => stub('AIJobMatchWindow'));
vi.mock('../HeatmapWindow', () => stub('HeatmapWindow'));
vi.mock('../SchoolJobsWindow', () => stub('SchoolJobsWindow'));
vi.mock('../SchoolManualContactsWindow', () => stub('SchoolManualContactsWindow'));

const DesktopDashboardContent = (await import('../DesktopDashboardContent')).default;

const VECINAS_DEL_GRUPO = ['JobBoardTabbedWindow', 'JobSearchWindow', 'AIJobMatchWindow'];
const OTRAS = [
    'StatsWindow', 'RecentVisitorsWindow', 'MapWindow', 'ChatAnalyticsWindow',
    'JobMarketAnalyticsWindow', 'HeatmapWindow', 'SchoolJobsWindow',
    'SchoolManualContactsWindow',
];

it('una ventana que lanza no se lleva a sus vecinas de grupo', async () => {
    // React registra el error en consola al activar un ErrorBoundary: se calla
    // para que el rojo del test sea la aserción, no el ruido.
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
        render(<DesktopDashboardContent stats={null} mapData={[]} chatAnalytics={null} jobData={{}} />);
        for (const nombre of VECINAS_DEL_GRUPO) {
            expect(await screen.findByText(nombre)).toBeInTheDocument();
        }
        for (const nombre of OTRAS) {
            expect(await screen.findByText(nombre)).toBeInTheDocument();
        }
    } finally {
        silencio.mockRestore();
    }
});
