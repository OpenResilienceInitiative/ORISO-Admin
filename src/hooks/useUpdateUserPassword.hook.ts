import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { userPasswordChangeEndpoint } from '../appConfig';

export const useUpdateUserPassword = (
    options?: UseMutationOptions<void, Error, { oldPassword: string; newPassword: string }, Error | Response>,
) => {
    return useMutation({
        mutationFn: ({ oldPassword, newPassword }) => {
            return fetchData({
                url: userPasswordChangeEndpoint,
                method: FETCH_METHODS.PUT,
                responseHandling: [FETCH_ERRORS.BAD_REQUEST],
                bodyData: JSON.stringify({ newPassword, oldPassword }),
            });
        },
        ...options,
    });
};
