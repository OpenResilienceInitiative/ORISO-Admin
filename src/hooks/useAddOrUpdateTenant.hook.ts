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

/**
 * Optional Träger fields TenantService keeps when absent: the mail-footer sender block and the
 * Träger DPO (Admin#1067).
 */
const SENDER_FIELDS = ['legalName', 'contactEmail', 'contactPhone', 'dataProtectionOfficer'] as const;

/**
 * The PUT/POST body: the cached tenant with the form's values laid over it.
 *
 * The sender fields are copied only when the form carries them. A form that does not render them
 * must not blank what is stored — "absent" is not "empty" (the Admin#715 trap). An emptied field
 * arrives as `''`, which TenantService stores as "not entered".
 */
export const buildTenantRequestBody = (
    stored: TenantAdminData | undefined,
    formData: TenantAdminData,
    subdomain: string,
) => {
    const senderFields = Object.fromEntries(
        SENDER_FIELDS.filter((field) => formData[field] !== undefined).map((field) => [field, formData[field]]),
    );
    return {
        ...stored,
        name: formData.name,
        subdomain,
        // NEW optional shared API fields. `topic` is FE-only and intentionally
        // never forwarded to the backend.
        address: formData.address,
        description: formData.description,
        ...senderFields,
        licensing: {
            ...formData.licensing,
        },
        settings: { ...formData.settings },
    };
};

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
            const bodyData = JSON.stringify(buildTenantRequestBody(data, formData, resolvedSubdomain));

            return fetchData({
                url: `${tenantAdminEndpoint}${id ? `/${id}` : ''}`,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                // Both refusals travel in a header, so both branches must hand the caller the
                // RAW response: 409 for a taken subdomain, 400 + X-Reason SUBDOMAIN_INVALID for
                // a malformed one. Without the 400 branch the reason header is lost.
                responseHandling: [
                    FETCH_SUCCESS.CONTENT,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                ],
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
