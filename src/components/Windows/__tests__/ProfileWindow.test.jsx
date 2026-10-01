import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileWindow from '../ProfileWindow';
import { showToast } from '../../UI/Toast';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: { language: 'es' },
    }),
}));

vi.mock('../FloatingWindow', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../../config/api', () => ({
    BACKEND_URL: 'https://portfolio.ngrok.app',
    DEFAULT_HEADERS: { 'ngrok-skip-browser-warning': 'true' },
}));

vi.mock('../../UI/Toast', () => ({ showToast: vi.fn() }));

const data = {
    name: 'Vicente Pau',
    title: 'Developer',
    profile: { description: 'Profile' },
};

describe('ProfileWindow downloads', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
        URL.createObjectURL = vi.fn(() => 'blob:test');
        URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    it('downloads JSON with the backend default headers', async () => {
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            blob: vi.fn().mockResolvedValue(new Blob(['{}'], { type: 'application/json' })),
        });
        render(<ProfileWindow data={data} />);

        fireEvent.click(screen.getByText('profile.downloadCV'));
        fireEvent.click(screen.getByText('profile.exportJSON'));

        await waitFor(() => expect(fetch).toHaveBeenCalledWith(
            'https://portfolio.ngrok.app/api/v1/cv/json-resume?lang=es',
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
        ));
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });

    it('shows a translated error instead of failing silently', async () => {
        fetch.mockResolvedValue({ ok: false, status: 429 });
        render(<ProfileWindow data={data} />);

        fireEvent.click(screen.getByText('profile.downloadCV'));
        fireEvent.click(screen.getByText('profile.exportPDF'));

        await waitFor(() => {
            expect(showToast).toHaveBeenCalledWith('profile.downloadRateLimited');
        });
    });
});
