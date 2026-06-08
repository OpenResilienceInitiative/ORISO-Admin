import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { tenantAdminsEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { encodeUsername } from '../utils/encryptionHelpers';
import { TENANT_QUERY_KEY } from './useSingleTenantData';
import { TENANT_ADMIN_QUERY_KEY, TENANT_ADMINS_QUERY_KEY, useTenantUserAdminData } from './useTenantUserAdminData';

interface UseAddOrUpdateTenantAdminOptions
    extends UseMutationOptions<CounselorData, Error, CounselorData, Error | Response> {
    id?: string;
}

export const useAddOrUpdateTenantAdmin = ({ id, ...options }: UseAddOrUpdateTenantAdminOptions) => {
    const queryClient = useQueryClient();
    const { data } = useTenantUserAdminData({ id, enabled: !!id && id !== 'add' });
    return useMutation(
        (formData) => {
            const formValues = formData as CounselorData & { username?: string; password?: string };
            const resolvedUsername = formValues.username?.trim()
                ? formValues.username.trim()
                : data?.username || encodeUsername(formValues.email);

            const { password, username: ignoredUsername, ...rest } = formValues;
            const body: Record<string, any> = { username: resolvedUsername, ...rest };
            if (password?.trim()) {
                body.password = password.trim();
            }
            const bodyData = JSON.stringify(body);

            return fetchData({
                url: `${tenantAdminsEndpoint}${id ? `/${id}` : ''}`,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                responseHandling: [
                    FETCH_SUCCESS.CONTENT,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.CATCH_ALL,
                ],
                bodyData,
            }).then(({ _embedded }) => _embedded);
        },
        {
            ...options,
            onSuccess: (responseData, variables) => {
                queryClient.setQueryData([TENANT_ADMIN_QUERY_KEY, responseData.id], responseData);
                queryClient.invalidateQueries(TENANT_ADMINS_QUERY_KEY);
                queryClient.removeQueries([TENANT_QUERY_KEY]);
                options?.onSuccess?.(responseData, variables, null);
            },
        },
    );
};
