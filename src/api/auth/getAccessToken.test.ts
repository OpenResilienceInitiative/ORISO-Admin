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
