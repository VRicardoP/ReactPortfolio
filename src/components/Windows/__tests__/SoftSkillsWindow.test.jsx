import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SoftSkillsWindow from '../SoftSkillsWindow';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

vi.mock('../FloatingWindow', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

describe('SoftSkillsWindow', () => {
    it('renders the icon carried by each skill instead of using its array index', () => {
        render(
            <SoftSkillsWindow
                data={{
                    softSkills: [
                        { text: 'Continuous learning', icon: '📚' },
                        { text: 'Initiative', icon: '🚀' },
                    ],
                }}
            />
        );

        expect(screen.getByText('Continuous learning').previousElementSibling).toHaveTextContent('📚');
        expect(screen.getByText('Initiative').previousElementSibling).toHaveTextContent('🚀');
    });

    it('keeps legacy string data readable during database reseeding', () => {
        render(<SoftSkillsWindow data={{ softSkills: ['Legacy skill'] }} />);
        expect(screen.getByText('Legacy skill')).toBeInTheDocument();
    });
});
