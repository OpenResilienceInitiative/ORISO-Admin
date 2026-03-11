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

    const buildInternalSubdomain = (name?: string) => {
        const base =
            (name || 'tenant')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 24) || 'tenant';
        return `${base}-${Date.now().toString().slice(-6)}`;
    };

    return useMutation(
        (formData) => {
            const resolvedSubdomain =
                typeof formData.subdomain === 'string' && formData.subdomain.trim() !== ''
                    ? formData.subdomain
                    : data?.subdomain || buildInternalSubdomain(formData.name);
            const bodyData = JSON.stringify({
                ...data,
                name: formData.name,
                subdomain: resolvedSubdomain,
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
