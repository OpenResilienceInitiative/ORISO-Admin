import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { tenantAdminsEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { encodeUsername } from '../utils/encryptionHelpers';
import { TENANT_QUERY_KEY } from './useSingleTenantData';
import { TENANT_ADMIN_QUERY_KEY, useTenantUserAdminData } from './useTenantUserAdminData';

interface UseAddOrUpdateTenantAdminOptions
    extends UseMutationOptions<CounselorData, Error, CounselorData, Error | Response> {
    id?: string;
}

export const useAddOrUpdateTenantAdmin = ({ id, ...options }: UseAddOrUpdateTenantAdminOptions) => {
    const queryClient = useQueryClient();
    const { data } = useTenantUserAdminData({ id, enabled: !!id && id !== 'add' });
    return useMutation(
        (formData) => {
            const bodyData = JSON.stringify({
                username: data?.username || encodeUsername(formData.email),
                ...formData,
            });

            return fetchData({
                url: `${tenantAdminsEndpoint}${id ? `/${id}` : ''}`,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                responseHandling: [FETCH_ERRORS.CATCH_ALL, FETCH_SUCCESS.CONTENT],
                bodyData,
            }).then(({ _embedded }) => _embedded);
        },
        {
            ...options,
            onSuccess: (responseData, variables) => {
                queryClient.setQueryData([TENANT_ADMIN_QUERY_KEY, responseData.id], responseData);
                queryClient.removeQueries([TENANT_QUERY_KEY]);
                options?.onSuccess?.(responseData, variables, null);
            },
        },
    );
};
