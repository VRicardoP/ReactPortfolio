import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// La bolsa de empleo mostraba titulo en idioma original y NINGUNA descripcion:
// «no hay nada para entender la oferta». Esto fija lo que la tarjeta pinta.

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: { text: '#ddd', primary: '#0f0', borderLight: '#333' } }),
}));
vi.mock('../../Windows/FloatingWindow', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../JobCardExtras', () => ({
    FreshnessBadge: () => null,
    CompanyResearchName: ({ children }) => <span>{children}</span>,
}));
vi.mock('../../../hooks/useJobApplication', () => ({
    default: () => ({ handleSave: vi.fn(), savedIds: new Set(), appliedIds: new Set() }),
}));
vi.mock('../JobBoardControls', () => ({ default: () => null }));
// El componente recibe `jobData` por FUENTE y lee `_normalized`; la paginacion
// sale de useJobBoardControls, que aqui devuelve la lista entera.
vi.mock('../../../hooks/useJobBoardControls', () => ({
    default: jobs => ({
        sortBy: 'newest', handleSortChange: vi.fn(), pagedJobs: jobs,
        page: 1, totalPages: 1, from: 1, to: jobs.length, setPage: vi.fn(),
    }),
}));

const JOBS = [
    { id: '1', source: 'arbeitnow', title: 'Softwareentwickler (m/w/d)',
      title_en: 'Software Developer (m/f/d)', company: 'Acme', url: 'https://e.com/1',
      summary: 'Backend role in Zurich. Python and Kubernetes. Hybrid.', tags: [] },
    { id: '2', source: 'arbeitnow', title: 'Data Engineer', title_en: null, summary: null,
      company: 'Beta', url: 'https://e.com/2',
      description_snippet: 'We build pipelines for retail analytics', tags: [] },
    { id: '3', source: 'jobgether', title: 'Ohne Text', title_en: null, summary: null,
      company: 'Gamma', url: 'https://e.com/3', description_snippet: '', tags: [] },
];

import JobBoardTabbedWindow from '../JobBoardTabbedWindow';

function pintar() {
    render(<JobBoardTabbedWindow jobData={{ arbeitnow: { _normalized: JOBS } }} />);
}

describe('Bolsa de empleo — título comprensible y resumen', () => {
    it('muestra el título traducido y enlaza a la oferta', () => {
        pintar();
        const enlace = screen.getByRole('link', { name: /Software Developer \(m\/f\/d\)/ });
        expect(enlace.getAttribute('href')).toBe('https://e.com/1');
    });

    it('muestra el resumen de la oferta', () => {
        pintar();
        expect(screen.getByText('Backend role in Zurich. Python and Kubernetes. Hybrid.')).toBeTruthy();
    });

    it('sin resumen cae al principio de la descripción', () => {
        pintar();
        expect(screen.getByText('We build pipelines for retail analytics')).toBeTruthy();
    });

    it('si la fuente no publica texto lo dice, en vez de dejar la tarjeta muda', () => {
        pintar();
        expect(screen.getByText('dashboard.aiMatch.noDescription')).toBeTruthy();
    });
});
