import { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { snackbar as notification } from '../components/Snackbar';
import { useAppearanceEditingRights } from './useAppearanceEditingRights.hook';
import { tenantPermissionPoliciesKey } from './useTenantPermissionPolicies';
import { useUserRoles } from './useUserRoles.hook';
import { getTenantAdminControls } from '../api/tenant/getTenantAdminControls';
import { getTenantPermissionPolicies } from '../api/tenant/tenantPermissionPolicies';
import { updateTenantAdminControls } from '../api/tenant/updateTenantAdminControls';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../api/tenant/getTenantAdminControls');
vi.mock('../api/tenant/updateTenantAdminControls');
vi.mock('../api/tenant/tenantPermissionPolicies');
vi.mock('./useUserRoles.hook');
vi.mock('./useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 7, settings: {} } }) }));

const setup = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, ...renderHook(() => useAppearanceEditingRights('7'), { wrapper }) };
};

describe('useAppearanceEditingRights', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useUserRoles).mockReturnValue({ isSuperAdmin: true } as ReturnType<typeof useUserRoles>);
        vi.mocked(getTenantPermissionPolicies).mockResolvedValue({ tenantId: 7, policies: {} });
        vi.mocked(updateTenantAdminControls).mockImplementation(async (body) => body);
    });

    it('refreshes the organisations copy after a save, so it does not show the old value', async () => {
        vi.mocked(getTenantAdminControls).mockResolvedValue({ permissionsPageEnabled: true });
        const { queryClient, result } = setup();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        await waitFor(() => expect(result.current.editable).toBe(true));

        act(() => result.current.save(false));

        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: tenantPermissionPoliciesKey('7') }));
    });

    it('does not send anything when the stored controls were never read, and reports it once', async () => {
        vi.mocked(getTenantAdminControls).mockRejectedValue(new Error('503'));
        const showError = vi.spyOn(notification, 'error').mockImplementation(() => undefined);
        const onError = vi.fn();
        const { result } = setup();
        await waitFor(() => expect(getTenantAdminControls).toHaveBeenCalled());
        await act(async () => {});

        act(() => result.current.save(false, { onError }));

        expect(updateTenantAdminControls).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledTimes(1);
        expect(showError).toHaveBeenCalledTimes(1);
        expect(result.current.editable).toBeUndefined();
    });

    it('treats a controls answer without a body as unknown, never as editable', async () => {
        vi.mocked(getTenantAdminControls).mockResolvedValue(null as never);
        const { result } = setup();
        await waitFor(() => expect(getTenantAdminControls).toHaveBeenCalled());
        await act(async () => {});

        expect(result.current.editable).toBeUndefined();
        act(() => result.current.save(true));
        expect(updateTenantAdminControls).not.toHaveBeenCalled();
    });
});
