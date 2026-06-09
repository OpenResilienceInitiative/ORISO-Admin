import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminsEndpoint } from '../appConfig';
import { TENANT_ADMIN_QUERY_KEY, TENANT_ADMINS_QUERY_KEY } from './useTenantUserAdminData';

export const useDeleteTenantAdmin = ({ ...options }: UseMutationOptions<void, Error, string>) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>(
        (id) =>
            fetchData({
                url: `${tenantAdminsEndpoint}/${id}`,
                method: FETCH_METHODS.DELETE,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
        {
            ...options,
            onSuccess: (responseData, variables, context) => {
                queryClient.invalidateQueries(TENANT_ADMINS_QUERY_KEY);
                queryClient.removeQueries([TENANT_ADMIN_QUERY_KEY, variables]);
                options?.onSuccess?.(responseData, variables, context);
            },
        },
    );
};
