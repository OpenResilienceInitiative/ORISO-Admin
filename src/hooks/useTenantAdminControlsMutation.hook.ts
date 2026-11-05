import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { updateTenantAdminControls } from '../api/tenant/updateTenantAdminControls';
import { TenantAdminControls } from '../types/TenantAdminControls';
import { TENANT_ADMIN_CONTROLS_KEY } from './useTenantAdminControls.hook';

interface TenantAdminControlsMutationOptions
    extends UseMutationOptions<TenantAdminControls, unknown, Partial<TenantAdminControls>> {
    successMessageKey?: string | false;
}

export const useTenantAdminControlsMutation = ({
    successMessageKey = 'tenants.message.settingsUpdate',
    ...options
}: TenantAdminControlsMutationOptions = {}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateTenantAdminControls,
        ...options,
        onMutate: async (variables, context) => {
            await queryClient.cancelQueries({ queryKey: [TENANT_ADMIN_CONTROLS_KEY] });
            return options?.onMutate?.(variables, context);
        },
        onSuccess: async (responseData, updatedData, onMutateResult, context) => {
            // A refetch may also have started during the PUT. It must not land afterward.
            await queryClient.cancelQueries({ queryKey: [TENANT_ADMIN_CONTROLS_KEY] });
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
            await options?.onSuccess?.(responseData, updatedData, onMutateResult, context);
        },
    });
};

/**
 * Saves the platform's recipient scope for internal group chats (ORISO-Admin#1215): no success
 * toast of its own (the control reports it), and a controls refetch already running is cancelled so
 * it cannot land after the save and bring the old scope back.
 */
export const useRecipientScopeControlsMutation = () => {
    const queryClient = useQueryClient();
    return useTenantAdminControlsMutation({
        successMessageKey: false,
        onMutate: () => queryClient.cancelQueries({ queryKey: [TENANT_ADMIN_CONTROLS_KEY] }),
    });
};
