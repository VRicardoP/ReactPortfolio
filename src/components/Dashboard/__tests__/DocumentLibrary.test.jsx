import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import SelectedOffersPanel from '../SelectedOffersPanel';

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(), pdf: vi.fn(), json: vi.fn(), refresh: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ authenticatedFetch: mocks.fetch, user: { id: 1 } }),
}));
vi.mock('../../../hooks/useDocumentGeneration', () => ({
    default: () => ({
        fetchAllDocuments: vi.fn(), fetchDocuments: mocks.refresh,
        getDocumentsFor: () => null, documents: {}, generatingSet: new Set(),
        downloadPdf: mocks.pdf, downloadJson: mocks.json,
    }),
}));
vi.mock('../../Windows/FloatingWindow', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../KanbanBoard', () => ({ default: () => <p>No applications</p> }));

const doc = (id, title) => ({
    id, application_id: 'deleted-application', doc_type: 'cv', language: 'en',
    created_at: '2026-09-08T10:00:00Z',
    application_snapshot: { title, company: 'Example' },
});
const response = items => ({ json: async () => items });
const title = 'dashboard.cvGeneration.library';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('retained document library', () => {
    it('lists every version without an application and downloads the exact document', async () => {
        mocks.fetch.mockResolvedValueOnce(response([doc('new', 'New CV'), doc('old', 'Old CV')]));
        render(<SelectedOffersPanel />);
        fireEvent.click(screen.getByRole('button', { name: title }));
        expect(await screen.findByText(/New CV/)).toBeInTheDocument();
        expect(screen.getByText(/Old CV/)).toBeInTheDocument();
        expect(mocks.fetch.mock.calls[0][0]).toMatch(/cv-generation\/$/);
        fireEvent.click(screen.getAllByRole('button', { name: 'dashboard.cvGeneration.downloadPdf' })[1]);
        expect(mocks.pdf).toHaveBeenCalledWith('old', 'cv_adapted.pdf');
        fireEvent.click(screen.getAllByRole('button', { name: 'dashboard.cvGeneration.downloadJson' })[0]);
        expect(mocks.json).toHaveBeenCalledWith('new', 'cv_adapted.json');
        expect(screen.queryByText('dashboard.cvGeneration.regenerate')).not.toBeInTheDocument();
    });

    it('deletes only the explicitly confirmed document and refreshes its application view', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mocks.fetch.mockResolvedValueOnce(response([doc('one', 'First'), doc('two', 'Second')]))
            .mockResolvedValueOnce({ status: 204 });
        render(<SelectedOffersPanel />);
        fireEvent.click(screen.getByRole('button', { name: title }));
        await screen.findByText(/First/);
        fireEvent.click(screen.getAllByRole('button', { name: 'dashboard.cvGeneration.deleteDocument' })[0]);
        await waitFor(() => expect(screen.queryByText(/First/)).not.toBeInTheDocument());
        expect(screen.getByText(/Second/)).toBeInTheDocument();
        expect(mocks.fetch.mock.calls[1][0]).toMatch(/cv-generation\/one$/);
        expect(mocks.fetch.mock.calls[1][1]).toEqual({ method: 'DELETE' });
        expect(mocks.refresh).toHaveBeenCalledWith('deleted-application');
    });

    it('does not delete after cancellation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        mocks.fetch.mockResolvedValueOnce(response([doc('one', 'Retained')]));
        render(<SelectedOffersPanel />);
        fireEvent.click(screen.getByRole('button', { name: title }));
        await screen.findByText(/Retained/);
        fireEvent.click(screen.getByRole('button', { name: 'dashboard.cvGeneration.deleteDocument' }));
        expect(mocks.fetch).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Retained/)).toBeInTheDocument();
    });

    it('keeps the document visible when deletion fails', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        mocks.fetch.mockResolvedValueOnce(response([doc('one', 'Retained')]))
            .mockRejectedValueOnce(new Error('503'));
        render(<SelectedOffersPanel />);
        fireEvent.click(screen.getByRole('button', { name: title }));
        await screen.findByText(/Retained/);
        fireEvent.click(screen.getByRole('button', { name: 'dashboard.cvGeneration.deleteDocument' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('dashboard.cvGeneration.libraryError');
        expect(screen.getByText(/Retained/)).toBeInTheDocument();
        expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it('shows an error rather than an empty success on unavailable history', async () => {
        mocks.fetch.mockRejectedValueOnce(new Error('unavailable'));
        render(<SelectedOffersPanel />);
        fireEvent.click(screen.getByRole('button', { name: title }));
        expect(await screen.findByRole('alert')).toHaveTextContent('dashboard.cvGeneration.libraryError');
    });
});
