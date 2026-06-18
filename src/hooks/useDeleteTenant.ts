import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { deleteTenantData } from '../api/tenant/deleteTenantData';
import { TENANTS_QUERY_KEY } from './useTenantsData';

export const useDeleteTenant = (options?: UseMutationOptions<void, Error, number>) => {
    const queryClient = useQueryClient();

    return useMutation((id) => deleteTenantData(id), {
        ...options,
        onSuccess: (responseData, variables, context) => {
            queryClient.invalidateQueries(TENANTS_QUERY_KEY);
            queryClient.removeQueries(['TENANT', variables]);
            options?.onSuccess?.(responseData, variables, context);
        },
    });
};
