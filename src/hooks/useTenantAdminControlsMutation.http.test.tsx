import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TENANT_ADMIN_CONTROLS_KEY, useTenantAdminControls } from './useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from './useTenantAdminControlsMutation.hook';

describe('platform permission save versus stale HTTP reads', () => {
    it.each(['before', 'during'])(
        'keeps the saved requirement when an old GET started %s the PUT finishes last',
        async (timing) => {
            const field = 'featureVideoCallsOneOnOneChatsEnabled';
            const initial = { permissionPolicies: { [field]: { value: true, mode: 'SUGGESTED' as const } } };
            const saved = { permissionPolicies: { [field]: { value: false, mode: 'ENFORCED' as const } } };
            let reads = 0;
            let writes = 0;
            let finishRead: () => void = () => undefined;
            let finishWrite: () => void = () => undefined;
            vi.stubGlobal(
                'fetch',
                vi.fn(async (request: Request) => {
                    if (request.method === 'PUT') {
                        writes += 1;
                        return new Promise<Response>((resolve) => {
                            finishWrite = () => resolve(Response.json(saved));
                        });
                    }
                    reads += 1;
                    if (reads === 1) return Response.json(initial);
                    return new Promise<Response>((resolve) => {
                        finishRead = () => resolve(Response.json(initial));
                    });
                }),
            );
            const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={client}>{children}</QueryClientProvider>
            );
            const { result } = renderHook(
                () => ({
                    read: useTenantAdminControls(),
                    save: useTenantAdminControlsMutation({ successMessageKey: false }),
                }),
                { wrapper },
            );
            await waitFor(() => expect(result.current.read.data).toEqual(initial));
            let refetch = Promise.resolve();
            const startRead = async () => {
                act(() => {
                    refetch = client.refetchQueries({ queryKey: [TENANT_ADMIN_CONTROLS_KEY] });
                });
                await waitFor(() => expect(reads).toBe(2));
            };
            if (timing === 'before') await startRead();
            let write: Promise<unknown> = Promise.resolve();
            act(() => {
                write = result.current.save.mutateAsync(saved);
            });
            await waitFor(() => expect(writes).toBe(1));
            if (timing === 'during') await startRead();
            await act(async () => {
                finishWrite();
                await write;
            });
            await act(async () => {
                finishRead();
                await refetch;
            });

            await waitFor(() => expect(result.current.read.data).toEqual(saved));
        },
    );
});
