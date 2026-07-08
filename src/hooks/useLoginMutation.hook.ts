import { useMutation } from '@tanstack/react-query';
import { apiServerSettings } from '../api/settings/apiServerSettings';
import { setTokens } from '../api/auth/auth';
import getAccessToken from '../api/auth/getAccessToken';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { tenantAccessEndpoint } from '../appConfig';
import { useAppConfigContext } from '../context/useAppConfig';
import { TwoFactorType } from '../enums/TwoFactorType';
import { LoginData } from '../types/loginData';
import { hasAdminPortalAccess } from '../utils/adminPortalAccess';

interface LoginParams {
    username: string;
    password: string;
    otp: string;
}

interface ErrorLogin {
    message: string;
    options?: {
        data: { otpType: TwoFactorType };
    };
}

export const ADMIN_PORTAL_ACCESS_DENIED = 'adminPortalAccessDenied';
export const TENANT_ACCESS_DENIED = 'tenantAccessDenied';

export const useLoginMutation = (tenantId: string) => {
    const { settings, setServerSettings } = useAppConfigContext();

    return useMutation<LoginData, ErrorLogin, LoginParams>({
        mutationKey: ['login', 'user-data', tenantId],
        mutationFn: async ({ username, password, otp }: any) => {
            // console.log('🔍 useLoginMutation: Starting login process');
            return getAccessToken({ username, password, otp }).then((data) => {
                if (!hasAdminPortalAccess(data.access_token)) {
                    return Promise.reject(new Error(ADMIN_PORTAL_ACCESS_DENIED));
                }

                // console.log('🔍 useLoginMutation: Got access token, checking tenant access');
                // We'll check in the server if we're allowed to access the app
                return fetchData({
                    url: tenantAccessEndpoint,
                    method: FETCH_METHODS.GET,
                    headersData: {
                        Authorization: `Bearer ${data.access_token}`,
                    },
                })
                    .then(() => {
                        // console.log('🔍 useLoginMutation: Tenant access check passed');
                        return data;
                    })
                    .catch((accessError) => {
                        // Keep the failure differentiated: an unreachable/slow server is
                        // not the same as "this account may not use this admin portal".
                        if (
                            accessError instanceof Error &&
                            (accessError.message === FETCH_ERRORS.TIMEOUT || accessError.message === FETCH_ERRORS.ABORT)
                        ) {
                            return Promise.reject(new Error(FETCH_ERRORS.TIMEOUT));
                        }
                        return Promise.reject(new Error(TENANT_ACCESS_DENIED));
                    });
            });
        },
        onSuccess: async (data) => {
            await setTokens(data.access_token, data.expires_in, data.refresh_token, data.refresh_expires_in);
            if (settings.useApiClusterSettings) {
                apiServerSettings().then(setServerSettings);
            }
        },
        onError: () => {
            // console.log('🔍 useLoginMutation: onError called with error:', error);
        },
    });
};
