import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateTenantAdminControls } from '../api/tenant/updateTenantAdminControls';
import { updateTenantPermissionPolicies } from '../api/tenant/tenantPermissionPolicies';
import { TENANT_ADMIN_CONTROLS_KEY } from './useTenantAdminControls.hook';
import { useRecipientScopeControlsMutation } from './useTenantAdminControlsMutation.hook';
import { tenantPermissionPoliciesKey, useTenantRecipientScopeMutation } from './useTenantPermissionPolicies';

// A refetch that is already running when the admin saves must not land afterwards and bring the old
// scope back (the page would show the choice jumping back although the save worked).

vi.mock('../api/tenant/updateTenantAdminControls', () => ({ updateTenantAdminControls: vi.fn() }));
vi.mock('../api/tenant/tenantPermissionPolicies', async () => ({
    ...(await vi.importActual<object>('../api/tenant/tenantPermissionPolicies')),
    updateTenantPermissionPolicies: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const OLD = { value: 'AGENCY', mode: 'SUGGESTED', inherited: true };
const SAVED = { value: 'PLATFORM', mode: 'SUGGESTED', inherited: false };

const slowRefetch = (queryClient: QueryClient, queryKey: readonly unknown[], stale: object) => {
    queryClient
        .fetchQuery({
            queryKey,
            queryFn: () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve(stale), 80);
                }),
        })
        // The save cancels this refetch on purpose.
        .catch(() => undefined);
};

const settle = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 200);
    });

describe('recipient scope mutations', () => {
    beforeEach(() => vi.clearAllMocks());

    it('keeps the saved Träger scope when an older refetch finishes afterwards', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const key = tenantPermissionPoliciesKey('7');
        const stale = { tenantId: 7, policies: {}, internalGroupChat: { recipientScope: OLD } };
        const saved = { tenantId: 7, policies: {}, internalGroupChat: { recipientScope: SAVED } };
        vi.mocked(updateTenantPermissionPolicies).mockResolvedValue(saved as never);
        const { result } = renderHook(() => useTenantRecipientScopeMutation('7'), { wrapper });

        slowRefetch(queryClient, key, stale);
        result.current.mutate({ tenantId: 7, policies: {} });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        await settle();

        expect(queryClient.getQueryData(key)).toEqual(saved);
    });

    it('keeps the saved platform scope when an older refetch finishes afterwards', async () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        const stale = { permissionsPageEnabled: true, internalGroupChat: { recipientScope: OLD } };
        const saved = { permissionsPageEnabled: true, internalGroupChat: { recipientScope: SAVED } };
        vi.mocked(updateTenantAdminControls).mockResolvedValue(saved as never);
        const { result } = renderHook(() => useRecipientScopeControlsMutation(), { wrapper });

        slowRefetch(queryClient, [TENANT_ADMIN_CONTROLS_KEY], stale);
        result.current.mutate({ permissionsPageEnabled: true } as never);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        await settle();

        expect(queryClient.getQueryData([TENANT_ADMIN_CONTROLS_KEY])).toEqual(saved);
    });
});
