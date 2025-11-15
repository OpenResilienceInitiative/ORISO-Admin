import { useMutation, useQueryClient } from 'react-query';
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

    return useMutation<unknown, Error, UserMutationData>(
        ({ twoFactorType, otp, secret }: UserMutationData) => {
            switch (twoFactorType) {
                case TwoFactorType.App:
                    return apiPutTwoFactorAuthApp({ secret, otp });
                case TwoFactorType.Email:
                    return apiPostTwoFactorAuthEmailWithCode(otp);
                default:
                    return Promise.resolve();
            }
        },
        {
            onSuccess: (_, { twoFactorType }) => {
                const cache = queryClient.getQueryData('user-data') as any;
                if (cache) {
                    cache.twoFactorAuth.isActive = true;
                    cache.twoFactorAuth.type = twoFactorType;
                    queryClient.getQueryData('user-data', cache);
                }
            },
        },
    );
};

export const useUserTwoFactorDelete = () => {
    const queryClient = useQueryClient();

    return useMutation(() => apiDeleteTwoFactorAuth(), {
        onSuccess: () => {
            const cache = queryClient.getQueryData('user-data') as any;
            if (cache) {
                cache.twoFactorAuth.isActive = false;
                queryClient.getQueryData('user-data', cache);
            }
        },
    });
};

export const useUserTwoFactorSendEmailCode = () => {
    const queryClient = useQueryClient();

    return useMutation<unknown, Error, string>((email: string) => apiPutTwoFactorAuthEmail(email), {
        onSuccess: (_, email) => {
            const cache = queryClient.getQueryData('user-data') as any;
            if (cache) {
                cache.email = email;
                queryClient.getQueryData('user-data', cache);
            }
        },
    });
};
