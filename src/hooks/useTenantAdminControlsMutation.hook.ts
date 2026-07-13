import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { updateTenantAdminControls } from '../api/tenant/updateTenantAdminControls';
import { TenantAdminControls } from '../types/TenantAdminControls';
import { TENANT_ADMIN_CONTROLS_KEY } from './useTenantAdminControls.hook';

interface TenantAdminControlsMutationOptions
    extends UseMutationOptions<unknown, unknown, Partial<TenantAdminControls>> {
    successMessageKey?: string | false;
}

export const useTenantAdminControlsMutation = ({
    successMessageKey = 'tenants.message.setting.update',
    ...options
}: TenantAdminControlsMutationOptions = {}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateTenantAdminControls,
        ...options,
        onSuccess: (responseData, updatedData, onMutateResult, context) => {
            // Cache the server's normalized response (backend fills every toggle via nullAsTrue and
            // preserves translation keys), not the partial request body — otherwise the cached
            // controls drop the fields the UI did not send.
            queryClient.setQueryData([TENANT_ADMIN_CONTROLS_KEY], responseData);
            if (successMessageKey !== false) {
                notification.success({
                    message: t(successMessageKey),
                    duration: 3,
                });
            }
            options?.onSuccess?.(responseData, updatedData, onMutateResult, context);
        },
    });
};
