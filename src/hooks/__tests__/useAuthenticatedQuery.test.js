import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useAuthenticatedQuery from '../useAuthenticatedQuery';

const mockAuthenticatedFetch = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ authenticatedFetch: mockAuthenticatedFetch }),
}));

const response = (data) => ({ json: async () => data });

describe('useAuthenticatedQuery', () => {
    beforeEach(() => vi.clearAllMocks());

    it('consulta al montar y expone los datos', async () => {
        mockAuthenticatedFetch.mockResolvedValue(response({ value: 1 }));
        const { result } = renderHook(() => useAuthenticatedQuery('/items'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data).toEqual({ value: 1 });
        expect(result.current.error).toBeNull();
    });

    it('permite una consulta manual con otra URL', async () => {
        mockAuthenticatedFetch.mockResolvedValue(response({ value: 2 }));
        const { result } = renderHook(() => (
            useAuthenticatedQuery(null, { enabled: false })
        ));

        await act(async () => result.current.refetch('/other'));

        expect(mockAuthenticatedFetch).toHaveBeenCalledWith('/other');
        expect(result.current.data).toEqual({ value: 2 });
    });

    it('descarta una respuesta anterior que llega tarde', async () => {
        let resolveFirst;
        mockAuthenticatedFetch
            .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
            .mockResolvedValueOnce(response({ value: 'new' }));
        const { result } = renderHook(() => (
            useAuthenticatedQuery('/first', { enabled: false })
        ));

        let first;
        await act(async () => {
            first = result.current.refetch('/first');
            await result.current.refetch('/second');
        });
        resolveFirst(response({ value: 'old' }));
        await act(async () => first);

        expect(result.current.data).toEqual({ value: 'new' });
    });

    it('expone el error y termina la carga', async () => {
        const failure = new Error('network');
        mockAuthenticatedFetch.mockRejectedValue(failure);
        const { result } = renderHook(() => useAuthenticatedQuery('/items'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        await waitFor(() => expect(result.current.error).toBe(failure));
        expect(result.current.data).toBeNull();
    });

    it('puede propagar el error al consumidor que lo necesita', async () => {
        const failure = new Error('critical');
        mockAuthenticatedFetch.mockRejectedValue(failure);
        const { result } = renderHook(() => useAuthenticatedQuery(
            '/items',
            { enabled: false, throwOnError: true },
        ));

        await expect(act(async () => result.current.refetch())).rejects.toThrow('critical');
    });
});
