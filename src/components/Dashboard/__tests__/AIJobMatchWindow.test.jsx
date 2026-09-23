import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// La tarjeta debe mostrar el titulo traducido y el resumen que el backend
// resuelve en segundo plano; mientras no existan, el principio de la
// descripcion; y si la fuente no publica texto, decirlo en vez de un hueco.

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../../context/ThemeContext', () => ({
    useTheme: () => ({ theme: { textHighlight: '#fff', text: '#ddd', primary: '#0f0', borderLight: '#333' } }),
}));
vi.mock('../../Windows/FloatingWindow', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../JobCardExtras', () => ({
    FreshnessBadge: () => null,
    CompanyResearchName: ({ children }) => <span>{children}</span>,
}));
vi.mock('../../../hooks/useJobApplication', () => ({
    default: () => ({ handleApply: vi.fn(), appliedIds: new Set(), handleSave: vi.fn(), savedIds: new Set() }),
}));
vi.mock('../../../hooks/useSkillsGap', () => ({
    default: () => ({ missingSkills: [], addedSkills: new Set(), togglingSkill: null, toggleSkill: vi.fn(), lastError: null }),
}));

const RESULTS = [
    { id: '1', source: 'arbeitnow', title: 'Softwareentwickler (m/w/d)', title_en: 'Software Developer (m/f/d)',
      summary: 'Backend role in Zurich. Python and Kubernetes. Hybrid.', company: 'Acme', ai_score: 80, fit: 'high' },
    { id: '2', source: 'arbeitnow', title: 'Data Engineer', title_en: null, summary: null,
      description_snippet: 'We build pipelines for retail analytics', company: 'Beta', ai_score: 70, fit: 'medium' },
    { id: '3', source: 'jobgether', title: 'Ohne Text', title_en: null, summary: null,
      description_snippet: '', company: 'Gamma', ai_score: 60, fit: 'low' },
];

vi.mock('../../../hooks/useAIJobMatch', () => ({
    default: () => ({
        results: RESULTS, metadata: null, dataSource: 'core', loading: false, progress: null, error: null,
        runAnalysis: vi.fn(), page: 0, totalPages: 1, pagedResults: RESULTS, prevPage: vi.fn(), nextPage: vi.fn(),
        expandedId: null, toggleExpanded: vi.fn(), translatedTitles: {}, translating: false, translateTitles: vi.fn(),
        activeTab: 'results', selectTab: vi.fn(), llmUnavailable: false,
    }),
    TAB_RESULTS: 'results',
    TAB_SKILLS_GAP: 'skills_gap',
}));

import AIJobMatchWindow from '../AIJobMatchWindow';

describe('AIJobMatchWindow — titulo traducido y resumen', () => {
    it('muestra el titulo en ingles con su insignia, y el resumen', () => {
        render(<AIJobMatchWindow />);
        expect(screen.getByText(/Software Developer \(m\/f\/d\)/)).toBeTruthy();
        expect(screen.getAllByText('dashboard.aiMatch.translated').length).toBe(1);
        expect(screen.getByText('Backend role in Zurich. Python and Kubernetes. Hybrid.')).toBeTruthy();
    });

    it('sin titulo traducido muestra el original, y sin resumen el principio de la descripcion', () => {
        render(<AIJobMatchWindow />);
        expect(screen.getByText('Data Engineer')).toBeTruthy();
        expect(screen.getByText('We build pipelines for retail analytics')).toBeTruthy();
    });

    it('si la fuente no publica texto lo dice, en vez de dejar un hueco', () => {
        render(<AIJobMatchWindow />);
        expect(screen.getByText('dashboard.aiMatch.noDescription')).toBeTruthy();
    });
});
