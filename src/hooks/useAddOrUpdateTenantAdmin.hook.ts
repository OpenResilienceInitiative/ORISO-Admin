import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { tenantAdminsEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { TENANT_QUERY_KEY } from './useSingleTenantData';
import { TENANT_ADMIN_QUERY_KEY, TENANT_ADMINS_QUERY_KEY, useTenantUserAdminData } from './useTenantUserAdminData';

interface UseAddOrUpdateTenantAdminOptions
    extends UseMutationOptions<CounselorData, Error, CounselorData, Error | Response> {
    id?: string;
}

export const useAddOrUpdateTenantAdmin = ({ id, ...options }: UseAddOrUpdateTenantAdminOptions) => {
    const queryClient = useQueryClient();
    const { data } = useTenantUserAdminData({ id, enabled: !!id && id !== 'add' });

    const normalizeSuccessfulResponse = async (response: unknown) => {
        if (response instanceof Response) {
            if (response.status === 204) {
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            // The backend returns HAL responses (application/hal+json), so match any JSON content
            // type rather than the exact "application/json".
            if (!contentType.includes('json')) {
                return null;
            }

            const textBody = await response.clone().text();
            if (!textBody.trim()) {
                return null;
            }

            return JSON.parse(textBody);
        }
        return response;
    };

    return useMutation(
        async (formData) => {
            const formValues = formData as CounselorData & { username?: string; password?: string };
            const resolvedUsername = formValues.username?.trim()
                ? formValues.username.trim()
                : data?.username || formValues.email; // MATRIX MIGRATION: backend handles encoding

            const { password, username: ignoredUsername, ...rest } = formValues;
            const body: Record<string, any> = { username: resolvedUsername, ...rest };
            if (password?.trim()) {
                body.password = password.trim();
            }
            const bodyData = JSON.stringify(body);

            const response = await fetchData({
                url: `${tenantAdminsEndpoint}${id ? `/${id}` : ''}`,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                responseHandling: [
                    FETCH_SUCCESS.CONTENT,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.CATCH_ALL,
                ],
                bodyData,
            });

            const normalizedResponse = await normalizeSuccessfulResponse(response);
            if (normalizedResponse && typeof normalizedResponse === 'object' && '_embedded' in normalizedResponse) {
                // eslint-disable-next-line no-underscore-dangle
                const embeddedData = (normalizedResponse as { _embedded: CounselorData })._embedded;
                return embeddedData;
            }

            return {
                ...(formValues as CounselorData),
            } as CounselorData;
        },
        {
            ...options,
            onSuccess: (responseData, variables) => {
                if (responseData?.id) {
                    queryClient.setQueryData([TENANT_ADMIN_QUERY_KEY, responseData.id], responseData);
                }
                queryClient.invalidateQueries(TENANT_ADMINS_QUERY_KEY);
                queryClient.removeQueries([TENANT_QUERY_KEY]);
                options?.onSuccess?.(responseData, variables, null);
            },
        },
    );
};
