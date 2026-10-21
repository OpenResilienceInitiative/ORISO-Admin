import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { userPasswordChangeEndpoint } from '../appConfig';
import { useAccountOperationActions } from './useAccountOperationActions';
import { type AccountOperationVariables, bindAccountOperationMutation } from '../utils/accountMutationIntent';
import { accountOperationHeaders, settleAccountOperation } from '../utils/accountOperationIntent';

export const useUpdateUserPassword = (
    options?: UseMutationOptions<
        void,
        Error,
        { oldPassword: string; newPassword: string } & AccountOperationVariables,
        Error | Response
    >,
) => {
    const actions = useAccountOperationActions();
    const mutation = useMutation({
        mutationFn: ({ oldPassword, newPassword, operationIntent }) => {
            const bodyData = JSON.stringify({ newPassword, oldPassword });
            return settleAccountOperation(
                operationIntent,
                fetchData({
                    url: userPasswordChangeEndpoint,
                    method: FETCH_METHODS.PUT,
                    responseHandling: [FETCH_ERRORS.BAD_REQUEST],
                    bodyData,
                    headersData: accountOperationHeaders(
                        operationIntent,
                        FETCH_METHODS.PUT,
                        userPasswordChangeEndpoint,
                        bodyData,
                    ),
                }),
            );
        },
        ...options,
    });
    return {
        ...mutation,
        onAccountEdit: () => actions.edited('password', userPasswordChangeEndpoint),
        mutate: bindAccountOperationMutation(actions, 'password', userPasswordChangeEndpoint, mutation.mutate),
        mutateAsync: bindAccountOperationMutation(
            actions,
            'password',
            userPasswordChangeEndpoint,
            mutation.mutateAsync,
        ),
    };
};
