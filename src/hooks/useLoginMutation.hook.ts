import { useMutation } from 'react-query';
import { setTokens } from '../api/auth/auth';
import getAccessToken from '../api/auth/getAccessToken';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { tenantAccessEndpoint } from '../appConfig';
import { TwoFactorType } from '../enums/TwoFactorType';
import { LoginData } from '../types/loginData';

interface LoginParams {
    username: string;
    password: string;
    otp: string;
}

interface ErrorLogin {
    message: string;
    options: {
        data: { otpType: TwoFactorType };
    };
}

export const useLoginMutation = (tenantId: string) => {
    return useMutation<LoginData, ErrorLogin, LoginParams>(
        ['login', 'user-data', tenantId],
        async ({ username, password, otp }: any) => {
            console.log('🔍 useLoginMutation: Starting login process');
            return getAccessToken({ username, password, otp }).then((data) => {
                console.log('🔍 useLoginMutation: Got access token, checking tenant access');
                // We'll check in the server if we're allowed to access the app
                return fetchData({
                    url: tenantAccessEndpoint,
                    method: FETCH_METHODS.GET,
                    headersData: {
                        Authorization: `Bearer ${data.access_token}`,
                    },
                })
                    .then(() => {
                        console.log('🔍 useLoginMutation: Tenant access check passed');
                        return data;
                    })
                    .catch((error) => {
                        console.log('🔍 useLoginMutation: Tenant access check failed:', error);
                        return Promise.reject(new Error(FETCH_ERRORS.UNAUTHORIZED));
                    });
            });
        },
        {
            onSuccess: (data) => {
                console.log('🔍 useLoginMutation: onSuccess called with data:', data);
                setTokens(data.access_token, data.expires_in, data.refresh_token, data.refresh_expires_in);
            },
            onError: (error) => {
                console.log('🔍 useLoginMutation: onError called with error:', error);
            },
        },
    );
};
