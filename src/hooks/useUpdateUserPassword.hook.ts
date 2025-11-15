import { useMutation, UseMutationOptions } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { mainURL } from '../appConfig';

export const useUpdateUserPassword = (
    options?: UseMutationOptions<void, Error, { oldPassword: string; newPassword: string }, Error | Response>,
) => {
    return useMutation(({ oldPassword, newPassword }) => {
        return fetchData({
            url: `${mainURL}/service/users/password/change`,
            method: FETCH_METHODS.PUT,
            responseHandling: [FETCH_ERRORS.BAD_REQUEST],
            bodyData: JSON.stringify({ newPassword, oldPassword }),
        });
    }, options);
};
