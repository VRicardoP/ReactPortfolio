import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import DocumentDeliveryRecovery from '../DocumentDeliveryRecovery';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ authenticatedFetch: mocks.fetch }) }));
const response = data => ({ json: async () => data });
const item = { operation_id: 'operation', application_id: 'deleted-app', created_at: '2026-09-08', status: 'pending' };
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });

it('reloads pending work and retries delivery, never the generator', async () => {
    const done = vi.fn();
    sessionStorage.setItem('document-operation:original', 'operation');
    sessionStorage.setItem('document-operation:other', 'another');
    mocks.fetch.mockResolvedValueOnce(response([item]))
        .mockResolvedValueOnce(response({ status: 'delivered' }))
        .mockResolvedValueOnce(response([]));
    render(<DocumentDeliveryRecovery onDelivered={done} />);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.cvGeneration.pendingDeliveries' }));
    fireEvent.click(await screen.findByRole('button', { name: 'dashboard.cvGeneration.retryDelivery' }));
    await waitFor(() => expect(done).toHaveBeenCalledWith('deleted-app'));
    expect(sessionStorage.getItem('document-operation:original')).toBeNull();
    expect(sessionStorage.getItem('document-operation:other')).toBe('another');
    expect(mocks.fetch.mock.calls[1][0]).toMatch(/operations\/operation\/retry$/);
    expect(mocks.fetch.mock.calls[1][1]).toEqual({ method: 'POST' });
    expect(mocks.fetch.mock.calls.some(([url]) => url.endsWith('/generate'))).toBe(false);
});

it('keeps pending work visible after another lost response', async () => {
    mocks.fetch.mockResolvedValueOnce(response([item]))
        .mockResolvedValueOnce(response({ status: 'pending' }));
    render(<DocumentDeliveryRecovery />);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.cvGeneration.pendingDeliveries' }));
    fireEvent.click(await screen.findByRole('button', { name: 'dashboard.cvGeneration.retryDelivery' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/deleted-app/)).toBeInTheDocument();
});

it('does not retry beyond the receipt safety window', async () => {
    mocks.fetch.mockResolvedValueOnce(response([{ ...item, error: 'receipt_window_expired' }]));
    render(<DocumentDeliveryRecovery />);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.cvGeneration.pendingDeliveries' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('dashboard.cvGeneration.deliveryExpired');
    expect(screen.queryByRole('button', { name: 'dashboard.cvGeneration.retryDelivery' })).not.toBeInTheDocument();
});
