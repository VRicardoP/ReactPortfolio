import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EducationWindow from '../EducationWindow';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'es-ES' },
    }),
}));

vi.mock('../FloatingWindow', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

const data = {
    education: [{
        title: 'DAW',
        date: '2025',
        type: 'degree',
        documents: [{ labelKey: 'education.europass', file: 'europass-daw' }],
    }],
};

describe('EducationWindow documents', () => {
    it('opens the localized Europass document in the desktop viewer', () => {
        const onOpenDocument = vi.fn();
        render(<EducationWindow data={data} onOpenDocument={onOpenDocument} />);

        fireEvent.click(screen.getByText('education.europass'));

        expect(onOpenDocument).toHaveBeenCalledWith({
            title: 'DAW — education.europass',
            fileUrl: '/docs/europass-daw-es.pdf',
        });
    });

    it('uses a direct PDF link when no desktop viewer callback is supplied', () => {
        render(<EducationWindow data={data} />);
        expect(screen.getByRole('link', { name: 'education.europass' }))
            .toHaveAttribute('href', '/docs/europass-daw-es.pdf');
    });
});
