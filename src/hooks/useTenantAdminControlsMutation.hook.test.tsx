import { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useTenantAdminControlsMutation } from './useTenantAdminControlsMutation.hook';
import { TENANT_ADMIN_CONTROLS_KEY } from './useTenantAdminControls.hook';
import { updateTenantAdminControls } from '../api/tenant/updateTenantAdminControls';

vi.mock('../api/tenant/updateTenantAdminControls', () => ({
    updateTenantAdminControls: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useTenantAdminControlsMutation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('caches the full server response, not the partial request body', async () => {
        // Server normalizes the partial request into the full controls object (backend nullAsTrue).
        const serverResponse = {
            permissionsPageEnabled: true,
            allowedPermissionToggles: { videoCalls: false, audioCalls: true, groupChat: true },
        };
        vi.mocked(updateTenantAdminControls).mockResolvedValue(serverResponse as never);

        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useTenantAdminControlsMutation({ successMessageKey: false }), {
            wrapper,
        });

        // The UI sends only the changed slice.
        result.current.mutate({ allowedPermissionToggles: { videoCalls: false } } as never);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(queryClient.getQueryData([TENANT_ADMIN_CONTROLS_KEY])).toEqual(serverResponse);
    });
});
