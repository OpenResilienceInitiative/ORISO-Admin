import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeleteConsultantOrAgencyAdmin } from './useDeleteConsultantOrAdmin';
import { useDeleteTenantAdmin } from './useDeleteTenantAdmin';
import { fetchData } from '../api/fetchData';

vi.mock('../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../api/fetchData')>()),
    fetchData: vi.fn(),
}));
const session = vi.hoisted(() => ({ scopedAccountCommands: true as boolean | null }));
vi.mock('./useUserData.hook', () => ({ useUserData: () => ({ data: session }) }));
vi.mock('../api/auth/tokenSessionStore', () => ({
    getSessionAccessToken: () =>
        `e30.${btoa(JSON.stringify({ sub: 'operator', iss: 'https://auth.example.test' }))}.test`,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

describe('actual identity removal hooks', () => {
    beforeEach(() => {
        session.scopedAccountCommands = true;
        vi.mocked(fetchData).mockReset();
    });

    it.each(['consultants', 'admins', 'tenant-admins'] as const)(
        'keeps the same UUID after an unknown %s removal and creates a new action after success',
        async (kind) => {
            const { result } = renderHook(
                () => {
                    const list = useDeleteConsultantOrAgencyAdmin({
                        typeOfUser: kind === 'admins' ? 'admins' : 'consultants',
                    });
                    const tenant = useDeleteTenantAdmin({});
                    return () =>
                        kind === 'tenant-admins'
                            ? tenant.mutateAsync('target')
                            : list.mutateAsync({ id: 'target', forceDelete: false });
                },
                { wrapper },
            );
            vi.mocked(fetchData)
                .mockRejectedValueOnce(new Response(null, { status: 403 }))
                .mockResolvedValue(undefined);
            await act(async () => {
                await expect(result.current()).rejects.toBeInstanceOf(Response);
            });
            await act(async () => {
                await result.current();
            });
            const [first, replay] = vi.mocked(fetchData).mock.calls.map(([props]) => props);
            expect(first.headersData).toEqual({ 'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/) });
            expect(replay).toEqual(first);
            await act(async () => {
                await result.current();
            });
            expect(vi.mocked(fetchData).mock.calls[2][0].headersData).not.toEqual(first.headersData);
        },
    );

    it('keeps the legacy pure-account transport when the server explicitly reports legacy mode', async () => {
        session.scopedAccountCommands = false;
        vi.mocked(fetchData).mockResolvedValue(undefined);
        const { result } = renderHook(() => useDeleteConsultantOrAgencyAdmin({ typeOfUser: 'consultants' }), {
            wrapper,
        });
        await act(async () => {
            await result.current.mutateAsync({ id: 'legacy' });
        });
        expect(vi.mocked(fetchData).mock.calls[0][0].headersData).toBeUndefined();
    });

    it('sends nothing while current-user command availability is unknown', async () => {
        session.scopedAccountCommands = null;
        const { result } = renderHook(() => useDeleteTenantAdmin({}), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync('target')).rejects.toThrow();
        });
        expect(fetchData).not.toHaveBeenCalled();
    });

    it.each(['consultants', 'admins', 'tenant-admins'] as const)(
        'blocks a mode switch while %s removal is unknown, then resumes the original UUID',
        async (kind) => {
            const { result, rerender } = renderHook(
                () => {
                    const list = useDeleteConsultantOrAgencyAdmin({
                        typeOfUser: kind === 'admins' ? 'admins' : 'consultants',
                    });
                    const tenant = useDeleteTenantAdmin({});
                    return () =>
                        kind === 'tenant-admins' ? tenant.mutateAsync('target') : list.mutateAsync({ id: 'target' });
                },
                { wrapper },
            );
            vi.mocked(fetchData)
                .mockRejectedValueOnce(new Response(null, { status: 403 }))
                .mockResolvedValue(undefined);
            await act(async () => {
                await expect(result.current()).rejects.toBeInstanceOf(Response);
            });
            const first = vi.mocked(fetchData).mock.calls[0][0];
            session.scopedAccountCommands = false;
            rerender();
            await act(async () => {
                await expect(result.current()).rejects.toThrow('ACCOUNT_COMMANDS_UNAVAILABLE');
            });
            expect(fetchData).toHaveBeenCalledTimes(1);
            session.scopedAccountCommands = true;
            rerender();
            await act(async () => {
                await result.current();
            });
            expect(vi.mocked(fetchData).mock.calls[1][0]).toEqual(first);
        },
    );

    it('does not turn an unknown legacy removal into a different scoped action', async () => {
        session.scopedAccountCommands = false;
        vi.mocked(fetchData).mockRejectedValue(new Error('TIMEOUT'));
        const { result, rerender } = renderHook(() => useDeleteTenantAdmin({}), { wrapper });
        await act(async () => {
            await expect(result.current.mutateAsync('target')).rejects.toThrow('TIMEOUT');
        });
        session.scopedAccountCommands = true;
        rerender();
        await act(async () => {
            await expect(result.current.mutateAsync('target')).rejects.toThrow('ACCOUNT_COMMANDS_UNAVAILABLE');
        });
        expect(fetchData).toHaveBeenCalledTimes(1);
    });

    it('keeps the original force flag until the previous scoped removal settles', async () => {
        vi.mocked(fetchData).mockRejectedValue(new Error('TIMEOUT'));
        const { result } = renderHook(() => useDeleteConsultantOrAgencyAdmin({ typeOfUser: 'consultants' }), {
            wrapper,
        });
        await act(async () => {
            await expect(result.current.mutateAsync({ id: 'target', forceDelete: false })).rejects.toThrow('TIMEOUT');
        });
        await act(async () => {
            await expect(result.current.mutateAsync({ id: 'target', forceDelete: true })).rejects.toThrow(
                'ACCOUNT_COMMANDS_UNAVAILABLE',
            );
        });
        expect(fetchData).toHaveBeenCalledTimes(1);
    });
});
