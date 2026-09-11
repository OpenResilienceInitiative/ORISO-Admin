// @vitest-environment node
// Node env: fetch/AbortController from one realm, no DOM needed (same as fetchData.test.ts).
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../appConfig', () => ({ default: { root: '/admin' } }));

// eslint-disable-next-line import/first
import { AUTH_BFF_REQUEST_TIMEOUT_MS, clearAuthTokensViaBff, refreshAuthTokensViaBff } from './authBffClient';

/**
 * Root cause of the endless invite spinner on a dead admin session: the BFF
 * refresh request had NO timeout. When it hung, `tryRefreshAccessToken` never
 * settled, `fetchData`'s 401 retry awaited it forever — and because auth.ts
 * caches the in-flight refresh promise, EVERY later 401-retry in the tab hung
 * on the same never-settling promise. The submit's `finally` never ran, the
 * spinner never stopped, no retried request ever reached the server.
 */
describe('refreshAuthTokensViaBff timeout guard', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('aborts a hanging refresh request instead of pending forever', async () => {
        vi.useFakeTimers();
        // A BFF that never answers but honours the abort signal — a stalled
        // connection, exactly the dead-session scenario from the server logs.
        const fetchMock = vi.fn(
            (_url: string, init?: RequestInit) =>
                new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => {
                        const abortError = new Error('aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    });
                }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const pending = refreshAuthTokensViaBff();
        const assertion = expect(pending).rejects.toThrow();

        let settled = false;
        pending.catch(() => {
            settled = true;
        });
        await vi.advanceTimersByTimeAsync(AUTH_BFF_REQUEST_TIMEOUT_MS - 1);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await assertion;
        expect(settled).toBe(true);
    });

    it('aborts a refresh whose BODY stalls after the headers arrived', async () => {
        vi.useFakeTimers();
        // Headers arrive fine (ok: true), but the body read never finishes on its
        // own — a proxy/BFF stalling mid-response. The abort timer must stay armed
        // through json(), or this promise (and the cached in-flight refresh) hangs
        // forever, recreating the endless spinner.
        const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
            Promise.resolve({
                ok: true,
                json: () =>
                    new Promise((_resolve, reject) => {
                        init?.signal?.addEventListener('abort', () => {
                            const abortError = new Error('aborted');
                            abortError.name = 'AbortError';
                            reject(abortError);
                        });
                    }),
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const pending = refreshAuthTokensViaBff();
        const assertion = expect(pending).rejects.toThrow();

        let settled = false;
        pending.catch(() => {
            settled = true;
        });
        await vi.advanceTimersByTimeAsync(AUTH_BFF_REQUEST_TIMEOUT_MS - 1);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await assertion;
        expect(settled).toBe(true);
    });

    it('resolves normally when the BFF answers in time', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: 'a', refresh_token: 'r', expires_in: 300 }),
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(refreshAuthTokensViaBff()).resolves.toMatchObject({ access_token: 'a' });
    });

    /*
     * logout() awaits the clear-token call (via invalidateAuthSession) BEFORE the
     * redirect to the login page, and its in-progress flag is never reset — so a
     * stalled clear-token used to strand the user with every retry swallowed.
     * Once this promise settles (even by rejection), invalidateAuthSession's
     * catch lets the redirect proceed.
     */
    it('aborts a hanging clear-token request so the logout redirect stays reachable', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn(
            (_url: string, init?: RequestInit) =>
                new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener('abort', () => {
                        const abortError = new Error('aborted');
                        abortError.name = 'AbortError';
                        reject(abortError);
                    });
                }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const pending = clearAuthTokensViaBff();
        const assertion = expect(pending).rejects.toThrow();

        let settled = false;
        pending.catch(() => {
            settled = true;
        });
        await vi.advanceTimersByTimeAsync(AUTH_BFF_REQUEST_TIMEOUT_MS - 1);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await assertion;
        expect(settled).toBe(true);
    });

    it('still maps a non-OK refresh answer to the keycloakLogin error', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
        vi.stubGlobal('fetch', fetchMock);

        await expect(refreshAuthTokensViaBff()).rejects.toThrow('keycloakLogin');
    });
});
