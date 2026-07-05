import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { deleteTenantData } from '../api/tenant/deleteTenantData';
import { TENANTS_QUERY_KEY } from './useTenantsData';

export const useDeleteTenant = (options?: UseMutationOptions<void, Error, number>) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => deleteTenantData(id),
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
            queryClient.removeQueries({ queryKey: ['TENANT', variables] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};
