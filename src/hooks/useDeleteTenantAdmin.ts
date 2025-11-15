import { useMutation, UseMutationOptions } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { tenantAdminsEndpoint } from '../appConfig';

export const useDeleteTenantAdmin = ({ ...options }: UseMutationOptions<void, Error, string>) => {
    return useMutation<void, Error, string>(
        (id) =>
            fetchData({
                url: `${tenantAdminsEndpoint}/${id}`,
                method: FETCH_METHODS.DELETE,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
        options,
    );
};
