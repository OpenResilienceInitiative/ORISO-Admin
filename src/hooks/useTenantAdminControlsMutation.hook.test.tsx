import { ReactNode } from 'react';
import { notification } from 'antd';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useTenantAdminControlsMutation } from './useTenantAdminControlsMutation.hook';
import { TENANT_ADMIN_CONTROLS_KEY } from './useTenantAdminControls.hook';
import { updateTenantAdminControls } from '../api/tenant/updateTenantAdminControls';
import translationDe from '../locales/de/translation.json';
import translationEn from '../locales/en/translation.json';

vi.mock('../api/tenant/updateTenantAdminControls', () => ({
    updateTenantAdminControls: vi.fn(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('antd', () => ({
    notification: { success: vi.fn() },
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

    it('defaults to a success message key that exists in every locale', async () => {
        // i18n runs with keySeparator: false and returnEmptyString: false, so a key
        // missing from a locale file is echoed verbatim in the notification.
        vi.mocked(updateTenantAdminControls).mockResolvedValue({} as never);

        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useTenantAdminControlsMutation(), { wrapper });

        result.current.mutate({} as never);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(notification.success).toHaveBeenCalledTimes(1);
        // The test's t() mock is the identity function, so message === the i18n key.
        const { message } = vi.mocked(notification.success).mock.calls[0][0];
        expect(typeof message).toBe('string');
        expect(translationDe).toHaveProperty([message as string]);
        expect(translationEn).toHaveProperty([message as string]);
    });
});
