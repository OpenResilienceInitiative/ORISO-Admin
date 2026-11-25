import { accountInactivityActivityEndpoint, CSRF_WHITELIST_HEADER } from '../../appConfig';
import generateCsrfToken from '../../utils/generateCsrfToken';

/** Optional activity reporting must not trigger token refresh, navigation or error toasts. */
export const reportAccountInactivityActivity = async (token: string, signal: AbortSignal): Promise<number> => {
    const csrfToken = generateCsrfToken();
    const response = await fetch(accountInactivityActivityEndpoint, {
        method: 'POST',
        credentials: 'include',
        signal,
        headers: {
            Authorization: `Bearer ${token}`,
            'X-CSRF-TOKEN': csrfToken,
            ...(import.meta.env.DEV && CSRF_WHITELIST_HEADER ? { [CSRF_WHITELIST_HEADER]: csrfToken } : {}),
        },
    });
    return response.status;
};
