import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { globalSupportAdminsEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { GLOBAL_SUPPORT_ADMINS_QUERY_KEY } from './useGlobalSupportAdminsData';

type CreateGlobalSupportAdmin = Pick<CounselorData, 'firstname' | 'lastname' | 'email' | 'username'> & {
    password?: string;
};

export const useCreateGlobalSupportAdmin = (
    options: UseMutationOptions<CounselorData, Error, CreateGlobalSupportAdmin> = {},
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData) =>
            fetchData({
                url: globalSupportAdminsEndpoint,
                method: FETCH_METHODS.POST,
                bodyData: JSON.stringify({
                    ...formData,
                    username: formData.username.trim(),
                    password: formData.password?.trim() || undefined,
                }),
                responseHandling: [
                    FETCH_SUCCESS.CONTENT,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.CATCH_ALL,
                ],
            }) as Promise<CounselorData>,
        ...options,
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [GLOBAL_SUPPORT_ADMINS_QUERY_KEY] });
            options.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
};
