// @vitest-environment node
// Node env: fetch/Request/AbortController from one realm (same as fetchData.test.ts).
import { afterEach, describe, expect, it, vi } from 'vitest';

const getSessionRefreshToken = vi.fn();
vi.mock('./tokenSessionStore', () => ({
    getSessionRefreshToken: () => getSessionRefreshToken(),
}));
vi.mock('../../appConfig', () => ({
    logoutEndpoint: 'https://api.test/auth/realms/app/protocol/openid-connect/logout',
}));

// eslint-disable-next-line import/first
import apiKeycloakLogout from './apiLogoutKeycloak';

/**
 * The 5s abort is the ONLY thing letting logout() proceed past a hanging
 * Keycloak request: logout() clears local state and redirects to the login page
 * only AFTER this promise settles, and its module-level in-progress flag is
 * never reset — so a hang here used to strand the user on the page forever,
 * with every later logout() call silently swallowed.
 */
describe('apiKeycloakLogout timeout guard', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('aborts a hanging Keycloak logout after 5s so the promise settles', async () => {
        vi.useFakeTimers();
        getSessionRefreshToken.mockReturnValue('refresh-token');
        // A Keycloak that never answers but honours the abort signal — a dead
        // connection, exactly the stranded-logout scenario.
        const fetchMock = vi.fn(
            (request: Request) =>
                new Promise((_resolve, reject) => {
                    request.signal.addEventListener('abort', () => {
                        const abortError = new Error('aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    });
                }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const pending = apiKeycloakLogout();
        const assertion = expect(pending).rejects.toThrow();

        let settled = false;
        pending.catch(() => {
            settled = true;
        });
        await vi.advanceTimersByTimeAsync(4_999);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await assertion;
        expect(settled).toBe(true);
    });

    it('resolves immediately without a request when there is no refresh token', async () => {
        getSessionRefreshToken.mockReturnValue(null);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        await expect(apiKeycloakLogout()).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('resolves on a 204 from Keycloak', async () => {
        getSessionRefreshToken.mockReturnValue('refresh-token');
        const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
        vi.stubGlobal('fetch', fetchMock);

        await expect(apiKeycloakLogout()).resolves.toMatchObject({ status: 204 });
    });
});
