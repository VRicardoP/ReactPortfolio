/**
 * Auditoría de accesibilidad del panel móvil (2026-10-28). Dos regresiones que
 * esto fija:
 *
 * 1. `defaultExpanded` se pasaba a cada ventana desde este layout pero
 *    NINGUNA lo reenviaba a `FloatingWindow` — la primera ventana de cada
 *    pestaña nunca se abría sola, pese a la intención explícita del código.
 * 2. Las pestañas (`TabBar`, `role="tab"`) no tenían ninguna relación ARIA
 *    con su panel (`role="tabpanel"`): un lector de pantalla no podía saber
 *    qué contenido controla cada pestaña.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

vi.mock('react-i18next', async importOriginal => ({
    ...(await importOriginal()),
    useTranslation: () => ({ t: key => key }),
}));
vi.mock('../../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: { primary: '#0ff' }, cycleTheme: vi.fn(), cycleBackground: vi.fn(), backgroundEffect: 'rain' }),
}));
vi.mock('../../../hooks/useSSEEvents', () => ({ useSSEEvents: () => ({}) }));
vi.mock('../../../hooks/useSchoolJobs', () => ({ default: () => ({ schools: [], jobs: [] }) }));

const stub = (nombre, propEsperada) => ({
    default: (props) => (
        <div>
            {nombre}
            {propEsperada && <span data-testid={`${nombre}-${propEsperada}`}>{String(props[propEsperada])}</span>}
        </div>
    ),
});
vi.mock('../StatsWindow', () => stub('StatsWindow', 'defaultExpanded'));
vi.mock('../RecentVisitorsWindow', () => stub('RecentVisitorsWindow'));
vi.mock('../HeatmapWindow', () => stub('HeatmapWindow'));
vi.mock('../MapWindow', () => stub('MapWindow', 'defaultExpanded'));
vi.mock('../ChatAnalyticsWindow', () => stub('ChatAnalyticsWindow', 'defaultExpanded'));
vi.mock('../JobBoardTabbedWindow', () => stub('JobBoardTabbedWindow', 'defaultExpanded'));
vi.mock('../JobMarketAnalyticsWindow', () => stub('JobMarketAnalyticsWindow'));
vi.mock('../SelectedOffersPanel', () => stub('SelectedOffersPanel'));
vi.mock('../JobSearchWindow', () => stub('JobSearchWindow'));
vi.mock('../AIJobMatchWindow', () => stub('AIJobMatchWindow'));
vi.mock('../SchoolJobsWindow', () => stub('SchoolJobsWindow', 'defaultExpanded'));
vi.mock('../SchoolManualContactsWindow', () => stub('SchoolManualContactsWindow'));

const MobileDashboardLayout = (await import('../MobileDashboardLayout')).default;

const render_ = () =>
    render(
        <MobileDashboardLayout
            stats={null}
            mapData={[]}
            chatAnalytics={null}
            jobData={{}}
            onLogout={vi.fn()}
            onGoHome={vi.fn()}
        />
    );

it('la primera ventana de la pestaña activa recibe defaultExpanded=true', async () => {
    render_();
    expect(await screen.findByTestId('StatsWindow-defaultExpanded')).toHaveTextContent('true');
});

it('la ventana de colegios existe y se abre al cambiar de pestaña', async () => {
    render_();
    fireEvent.click(screen.getByRole('tab', { name: /dashboard.tab.schools/ }));

    expect(await screen.findByText('SchoolJobsWindow')).toBeInTheDocument();
    expect(await screen.findByText('SchoolManualContactsWindow')).toBeInTheDocument();
    expect(screen.getByTestId('SchoolJobsWindow-defaultExpanded')).toHaveTextContent('true');
});

it('cada pestaña declara el panel que controla, y el panel se identifica con esa pestaña', async () => {
    render_();
    const tabSchools = screen.getByRole('tab', { name: /dashboard.tab.schools/ });
    fireEvent.click(tabSchools);

    const panel = await screen.findByRole('tabpanel');
    // La relación tiene que cerrarse en los dos sentidos: la pestaña dice qué
    // panel controla, y el panel dice qué pestaña lo etiqueta.
    expect(tabSchools).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tabSchools.id);
});

it('el panel cambia de id/etiqueta al cambiar de pestaña (no queda uno fijo)', async () => {
    render_();
    const panelInicial = await screen.findByRole('tabpanel');
    const idInicial = panelInicial.id;

    fireEvent.click(screen.getByRole('tab', { name: /dashboard.tab.jobs/ }));
    const panelJobs = await screen.findByRole('tabpanel');

    expect(panelJobs.id).not.toBe(idInicial);
    expect(panelJobs.id).toBe('dashboard-panel-jobs');
});
