import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    apiDeleteTwoFactorAuth,
    apiPostTwoFactorAuthEmailWithCode,
    apiPutTwoFactorAuthApp,
    apiPutTwoFactorAuthEmail,
} from '../api/user/apiTwoFactorAuth';
import { TwoFactorType } from '../enums/TwoFactorType';

interface UserMutationData {
    twoFactorType: TwoFactorType;
    otp: string;
    secret?: string;
}

export const useUserTwoFactorAuth = () => {
    const queryClient = useQueryClient();

    return useMutation<unknown, Error, UserMutationData>({
        mutationFn: ({ twoFactorType, otp, secret }: UserMutationData) => {
            switch (twoFactorType) {
                case TwoFactorType.App:
                    return apiPutTwoFactorAuthApp({ secret, otp });
                case TwoFactorType.Email:
                    return apiPostTwoFactorAuthEmailWithCode(otp);
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
};

export const useUserTwoFactorDelete = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => apiDeleteTwoFactorAuth(),
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
};

export const useUserTwoFactorSendEmailCode = () => {
    const queryClient = useQueryClient();

    return useMutation<unknown, Error, string>({
        mutationFn: (email: string) => apiPutTwoFactorAuthEmail(email),
        onSuccess: (_, email) => {
            const cache = queryClient.getQueryData(['user-data']) as any;
            if (cache) {
                cache.email = email;
                queryClient.getQueryData(['user-data']);
            }
        },
    });
};
