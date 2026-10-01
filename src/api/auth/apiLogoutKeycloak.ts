import { logoutEndpoint } from '../../appConfig';
import { getSessionRefreshToken } from './tokenSessionStore';

const apiKeycloakLogout = (): Promise<any> =>
    new Promise((resolve, reject) => {
        const refreshToken = getSessionRefreshToken();
        if (!refreshToken) {
            resolve(null);
            return;
        }

        const data = `client_id=app&grant_type=refresh_token&refresh_token=${refreshToken}`;
        // Bounded: logout() only clears local state and redirects AFTER this settles,
        // and its module-level in-progress flag is never reset — a hanging Keycloak
        // logout used to leave the user stranded on the page with no redirect, ever.
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5_000);
        const req = new Request(logoutEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'cache-control': 'no-cache',
            },
            credentials: 'include',
            body: data,
            signal: controller.signal,
        });

        fetch(req)
            .then((response) => {
                if (response.status === 204) {
                    resolve(response);
                } else {
                    reject(new Error('keycloakLogout'));
                }
            })
            .catch((error) => {
                reject(error);
            });
    });

export default apiKeycloakLogout;
