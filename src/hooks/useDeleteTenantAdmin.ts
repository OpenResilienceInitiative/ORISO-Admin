import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { deleteTenantAdminData } from '../api/admins/deleteTenantAdminData';
import { TENANT_ADMIN_QUERY_KEY, TENANT_ADMINS_QUERY_KEY } from './useTenantUserAdminData';
import { useIdentityRemovalCommand } from './useIdentityRemovalCommand';

export const useDeleteTenantAdmin = ({ ...options }: UseMutationOptions<void, Error, string>) => {
    const queryClient = useQueryClient();
    const remove = useIdentityRemovalCommand('remove-tenant-admin-identity');

    return useMutation<void, Error, string>({
        mutationFn: (id) => remove(id, null, (_payload, intent) => deleteTenantAdminData(id, intent)),
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [TENANT_ADMINS_QUERY_KEY] });
            queryClient.removeQueries({ queryKey: [TENANT_ADMIN_QUERY_KEY, variables] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};
