import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { TenantAdminData } from '../types/TenantAdminData';
import { useSingleTenantData } from './useSingleTenantData';

interface UseAddOrUpdateTenantOptions
    extends UseMutationOptions<TenantAdminData, Error, TenantAdminData, Error | Response> {
    id?: string;
}

export const useAddOrUpdateTenant = ({ id, ...options }: UseAddOrUpdateTenantOptions) => {
    const queryClient = useQueryClient();
    const { data } = useSingleTenantData({ id, enabled: !!id });
    return useMutation(
        (formData) => {
            const bodyData = JSON.stringify({
                ...data,
                name: formData.name,
                subdomain: formData.subdomain,
                licensing: {
                    ...formData.licensing,
                },
            });

            return fetchData({
                url: `${tenantAdminEndpoint}${id ? `/${id}` : ''}`,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.CONFLICT_WITH_RESPONSE],
                bodyData,
            });
        },
        {
            ...options,
            onSuccess: (responseData, variables) => {
                queryClient.setQueryData(['TENANT', responseData.id], { ...responseData, ...variables });
                options?.onSuccess?.(responseData, variables, null);
            },
        },
    );
};
