import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { mainURL } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { USER_DATA_KEY } from './useUserData.hook';

export const useUpdateUserData = (
    options?: UseMutationOptions<CounselorData, Error, Partial<CounselorData>, Error | Response>,
) => {
    const queryClient = useQueryClient();
    return useMutation(
        (formData) => {
            const bodyData = JSON.stringify({
                ...formData,
            });

            return fetchData({
                url: `${mainURL}/service/useradmin/data`,
                method: FETCH_METHODS.PATCH,
                responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.CONFLICT_WITH_RESPONSE],
                bodyData,
            });
        },
        {
            ...options,
            onSuccess: (responseData, variables) => {
                queryClient.invalidateQueries(USER_DATA_KEY);
                options?.onSuccess?.(responseData, variables, null);
            },
        },
    );
};
