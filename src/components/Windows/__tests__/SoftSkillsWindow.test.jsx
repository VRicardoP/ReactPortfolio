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
    it('converts legacy emoji data into stable text badges', () => {
        render(
            <SoftSkillsWindow
                data={{
                    softSkills: [
                        { text: 'Continuous learning', icon: '\u{1F4DA}' },
                        { text: 'Initiative', icon: '\u{1F680}' },
                    ],
                }}
            />
        );

        expect(screen.getByText('Continuous learning').previousElementSibling).toHaveTextContent('EDU');
        expect(screen.getByText('Initiative').previousElementSibling).toHaveTextContent('GO');
    });

    it('keeps legacy string data readable during database reseeding', () => {
        render(<SoftSkillsWindow data={{ softSkills: ['Legacy skill'] }} />);
        expect(screen.getByText('Legacy skill')).toBeInTheDocument();
        expect(screen.getByText('Legacy skill').previousElementSibling).toHaveTextContent('SKL');
    });

    it('does not render unknown pictograms supplied by the API', () => {
        render(<SoftSkillsWindow data={{ softSkills: [{ text: 'Future skill', icon: '\u{1F47E}' }] }} />);
        expect(screen.getByText('Future skill').previousElementSibling).toHaveTextContent('SKL');
    });
});
