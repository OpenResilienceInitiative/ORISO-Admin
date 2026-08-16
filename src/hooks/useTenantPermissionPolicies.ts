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
