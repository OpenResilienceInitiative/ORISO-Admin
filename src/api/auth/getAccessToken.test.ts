import { afterEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS, FetchErrorWithOptions } from '../fetchData';
import getAccessToken from './getAccessToken';

describe('getAccessToken', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns token data for a successful login response', async () => {
        const loginData = {
            access_token: 'access-token',
            expires_in: 300,
            refresh_token: 'refresh-token',
            refresh_expires_in: 600,
        };
        const fetchMock = vi.fn().mockResolvedValue({
            status: 200,
            json: () => Promise.resolve(loginData),
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(getAccessToken({ username: 'admin@example.com', password: 'correct' })).resolves.toEqual(
            loginData,
        );
    });

    it('keeps bad credentials as UNAUTHORIZED after the email fallback was tried', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ status: 401 });
        vi.stubGlobal('fetch', fetchMock);

        await expect(getAccessToken({ username: 'admin@example.com', password: 'wrong' })).rejects.toThrow(
            FETCH_ERRORS.UNAUTHORIZED,
        );
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('preserves OTP challenge details for bad requests', async () => {
        const otpResponse = { otpType: 'APP' };
        const fetchMock = vi.fn().mockResolvedValue({
            status: 400,
            json: () => Promise.resolve(otpResponse),
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(getAccessToken({ username: 'admin@example.com', password: 'correct' })).rejects.toMatchObject(
            new FetchErrorWithOptions(FETCH_ERRORS.BAD_REQUEST, { data: otpResponse }),
        );
    });

    // #1338: Keycloak answers 429 when the per-window ceiling for code mails is
    // reached, and has always answered 429 for a code guessed too often. Both used
    // to fall into the catch-all below and surface as "server unreachable", which
    // sent people reloading and retyping instead of waiting.
    it('keeps a refused-because-rate-limited login apart from an unreachable server', async () => {
        const rateLimitResponse = { error: 'invalid_grant', otpType: 'EMAIL', resendAvailableInSeconds: 420 };
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ status: 429, json: () => Promise.resolve(rateLimitResponse) }),
        );

        await expect(getAccessToken({ username: 'admin@example.com', password: 'correct' })).rejects.toMatchObject(
            new FetchErrorWithOptions(FETCH_ERRORS.TOO_MANY_REQUESTS, { data: rateLimitResponse }),
        );
    });

    it('still reports a 429 without a readable body as TOO_MANY_REQUESTS', async () => {
        // the ingress rate limit (slice 4) answers with HTML, not JSON
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ status: 429, json: () => Promise.reject(new Error('not json')) }),
        );

        await expect(getAccessToken({ username: 'admin@example.com', password: 'correct' })).rejects.toMatchObject({
            message: FETCH_ERRORS.TOO_MANY_REQUESTS,
        });
    });

    it('reports an unreachable auth server as TIMEOUT so the login form can show the network message', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

        await expect(getAccessToken({ username: 'admin@example.com', password: 'correct' })).rejects.toThrow(
            FETCH_ERRORS.TIMEOUT,
        );
    });

    it('reports unexpected auth server responses as TIMEOUT instead of blaming credentials', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }));

        await expect(getAccessToken({ username: 'admin@example.com', password: 'correct' })).rejects.toThrow(
            FETCH_ERRORS.TIMEOUT,
        );
    });
});
