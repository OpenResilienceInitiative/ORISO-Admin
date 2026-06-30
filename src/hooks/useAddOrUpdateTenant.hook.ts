import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { tenantAdminEndpoint } from '../appConfig';
import { TenantAdminData } from '../types/TenantAdminData';
import { useSingleTenantData } from './useSingleTenantData';
import { TENANTS_QUERY_KEY } from './useTenantsData';

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

    return useMutation({
        mutationFn: (formData) => {
            const resolvedSubdomain =
                typeof formData.subdomain === 'string' && formData.subdomain.trim() !== ''
                    ? formData.subdomain
                    : data?.subdomain || buildInternalSubdomain(formData.name);
            const bodyData = JSON.stringify({
                ...data,
                name: formData.name,
                subdomain: resolvedSubdomain,
                // NEW optional shared API fields. `topic` is FE-only and intentionally
                // never forwarded to the backend.
                address: formData.address,
                description: formData.description,
                licensing: {
                    ...formData.licensing,
                },
                settings: { ...formData.settings },
            });

            return fetchData({
                url: `${tenantAdminEndpoint}${id ? `/${id}` : ''}`,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.CONFLICT_WITH_RESPONSE],
                bodyData,
            });
        },
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.setQueryData(['TENANT', responseData.id], { ...responseData, ...variables });
            queryClient.invalidateQueries({ queryKey: [TENANTS_QUERY_KEY] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};
