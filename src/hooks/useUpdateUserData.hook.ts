import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { userAdminDataEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { USER_DATA_KEY } from './useUserData.hook';

export const useUpdateUserData = (
    options?: UseMutationOptions<CounselorData, Error, Partial<CounselorData>, Error | Response>,
) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formData) => {
            const bodyData = JSON.stringify({
                ...formData,
            });

            return fetchData({
                url: userAdminDataEndpoint,
                method: FETCH_METHODS.PATCH,
                responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.CONFLICT_WITH_RESPONSE],
                bodyData,
            });
        },
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [USER_DATA_KEY] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};
