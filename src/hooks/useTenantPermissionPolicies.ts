import { notification } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTenantPermissionPolicies, updateTenantPermissionPolicies } from '../api/tenant/tenantPermissionPolicies';
import type { TenantPermissionPolicies } from '../types/permissionPolicy';

export const tenantPermissionPoliciesKey = (tenantId: string) => ['tenant-permission-policies', tenantId] as const;

export const useTenantPermissionPolicies = (tenantId: string, enabled = true) =>
    useQuery({
        queryKey: tenantPermissionPoliciesKey(tenantId),
        queryFn: () => getTenantPermissionPolicies(tenantId),
        enabled: enabled && Boolean(tenantId),
    });

export const useTenantPermissionPoliciesMutation = (tenantId: string) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: updateTenantPermissionPolicies,
        onMutate: async (next) => {
            await queryClient.cancelQueries({ queryKey: tenantPermissionPoliciesKey(tenantId) });
            const previous = queryClient.getQueryData<TenantPermissionPolicies>(tenantPermissionPoliciesKey(tenantId));
            queryClient.setQueryData(tenantPermissionPoliciesKey(tenantId), next);
            return { previous };
        },
        onError: (_error, _next, context) => {
            queryClient.setQueryData(tenantPermissionPoliciesKey(tenantId), context?.previous);
            notification.error({ message: t('tenants.permissions.policy.saveError') });
        },
        onSuccess: (saved) => queryClient.setQueryData(tenantPermissionPoliciesKey(tenantId), saved),
    });
};

/**
 * Saves the Träger's recipient scope for internal group chats (ORISO-Admin#1215). Unlike the switch
 * mutation it neither updates the cache ahead of the server nor raises its own notification: the
 * scope control shows the failed save beside the edit, and must not see its value jump back.
 */
export const useTenantRecipientScopeMutation = (tenantId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateTenantPermissionPolicies,
        onSuccess: (saved) => queryClient.setQueryData(tenantPermissionPoliciesKey(tenantId), saved),
    });
};
