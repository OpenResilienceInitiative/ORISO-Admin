import { twoFactorAuth, twoFactorAuthAppEmail } from '../appConfig';
import { useAccountOperationActions } from './useAccountOperationActions';
import { type AccountOperationVariables, bindAccountOperationMutation } from '../utils/accountMutationIntent';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    apiDeleteTwoFactorAuth,
    apiPostTwoFactorAuthEmailWithCode,
    apiPutTwoFactorAuthApp,
    apiPutTwoFactorAuthEmail,
} from '../api/user/apiTwoFactorAuth';
import { TwoFactorType } from '../enums/TwoFactorType';

interface UserMutationData extends AccountOperationVariables {
    twoFactorType: TwoFactorType;
    otp: string;
    secret?: string;
}

export const useUserTwoFactorAuth = () => {
    const queryClient = useQueryClient();
    const actions = useAccountOperationActions();

    const mutation = useMutation<unknown, Error, UserMutationData>({
        mutationFn: ({ twoFactorType, otp, secret, operationIntent }: UserMutationData) => {
            switch (twoFactorType) {
                case TwoFactorType.App:
                    return apiPutTwoFactorAuthApp({ secret, otp }, operationIntent);
                case TwoFactorType.Email:
                    return apiPostTwoFactorAuthEmailWithCode(otp, operationIntent);
                default:
                    return Promise.resolve();
            }
        },
        onSuccess: (_, { twoFactorType }) => {
            queryClient.setQueryData(['user-data'], (cache: any) =>
                cache
                    ? {
                          ...cache,
                          twoFactorAuth: {
                              ...cache.twoFactorAuth,
                              isActive: true,
                              type: twoFactorType,
                          },
                      }
                    : cache,
            );
        },
    });
    return {
        ...mutation,
        onAccountEdit: () => actions.edited('2fa-activate', twoFactorAuth),
        mutate: bindAccountOperationMutation(actions, '2fa-activate', twoFactorAuth, mutation.mutate),
        mutateAsync: bindAccountOperationMutation(actions, '2fa-activate', twoFactorAuth, mutation.mutateAsync),
    };
};

export const useUserTwoFactorDelete = () => {
    const queryClient = useQueryClient();
    const actions = useAccountOperationActions();

    const mutation = useMutation<unknown, Error, AccountOperationVariables>({
        mutationFn: ({ operationIntent }) => apiDeleteTwoFactorAuth(operationIntent),
        onSuccess: () => {
            queryClient.setQueryData(['user-data'], (cache: any) =>
                cache
                    ? {
                          ...cache,
                          twoFactorAuth: { ...cache.twoFactorAuth, isActive: false },
                      }
                    : cache,
            );
        },
    });
    const mutate = bindAccountOperationMutation(actions, '2fa-delete', twoFactorAuth, mutation.mutate);
    const mutateAsync = bindAccountOperationMutation(actions, '2fa-delete', twoFactorAuth, mutation.mutateAsync);
    return {
        ...mutation,
        onAccountEdit: () => actions.edited('2fa-delete', twoFactorAuth),
        mutate: (_variables?: void, options?: Parameters<typeof mutation.mutate>[1]) => mutate({}, options),
        mutateAsync: (_variables?: void, options?: Parameters<typeof mutation.mutateAsync>[1]) =>
            mutateAsync({}, options),
    };
};

export const useUserTwoFactorSendEmailCode = () => {
    const queryClient = useQueryClient();
    const actions = useAccountOperationActions();

    const mutation = useMutation<unknown, Error, { email: string } & AccountOperationVariables>({
        mutationFn: ({ email, operationIntent }) => apiPutTwoFactorAuthEmail(email, operationIntent),
        onSuccess: (_, { email }) => {
            const cache = queryClient.getQueryData(['user-data']) as any;
            if (cache) {
                cache.email = email;
                queryClient.getQueryData(['user-data']);
            }
        },
    });
    const mutate = bindAccountOperationMutation(actions, '2fa-email-send', twoFactorAuthAppEmail, mutation.mutate);
    const mutateAsync = bindAccountOperationMutation(
        actions,
        '2fa-email-send',
        twoFactorAuthAppEmail,
        mutation.mutateAsync,
    );
    return {
        ...mutation,
        onAccountEdit: () => actions.edited('2fa-email-send', twoFactorAuthAppEmail),
        mutate: (email: string, options?: Parameters<typeof mutation.mutate>[1]) => mutate({ email }, options),
        mutateAsync: (email: string, options?: Parameters<typeof mutation.mutateAsync>[1]) =>
            mutateAsync({ email }, options),
    };
};
