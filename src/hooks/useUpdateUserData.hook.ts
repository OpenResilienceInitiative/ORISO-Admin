import { useCallback } from 'react';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { userAdminDataEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { USER_DATA_KEY } from './useUserData.hook';
import { useAccountOperationActions } from './useAccountOperationActions';
import { type AccountOperationVariables, bindAccountOperationMutation } from '../utils/accountMutationIntent';
import { accountOperationHeaders, settleAccountOperation } from '../utils/accountOperationIntent';

export const useUpdateUserData = (
    options?: UseMutationOptions<
        CounselorData,
        Error,
        Partial<CounselorData> & AccountOperationVariables,
        Error | Response
    >,
) => {
    const queryClient = useQueryClient();
    const actions = useAccountOperationActions();
    const mutation = useMutation({
        mutationFn: ({ operationIntent, ...formData }) => {
            const bodyData = JSON.stringify({
                ...formData,
            });

            return settleAccountOperation(
                operationIntent,
                fetchData({
                    url: userAdminDataEndpoint,
                    method: FETCH_METHODS.PATCH,
                    responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.CONFLICT_WITH_RESPONSE],
                    bodyData,
                    headersData: accountOperationHeaders(
                        operationIntent,
                        FETCH_METHODS.PATCH,
                        userAdminDataEndpoint,
                        bodyData,
                    ),
                }),
            );
        },
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [USER_DATA_KEY] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
    const onAccountEdit = useCallback(() => actions.edited('profile', userAdminDataEndpoint), [actions]);
    return {
        ...mutation,
        onAccountEdit,
        mutate: bindAccountOperationMutation(actions, 'profile', userAdminDataEndpoint, mutation.mutate),
        mutateAsync: bindAccountOperationMutation(actions, 'profile', userAdminDataEndpoint, mutation.mutateAsync),
    };
};
