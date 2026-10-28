import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleTokenRefresh, tryRefreshAccessToken } from './auth';
import { clearAuthTokensViaBff, refreshAuthTokensViaBff, setAuthTokensViaBff } from './authBffClient';
import { clearSessionTokens, getSessionAccessToken, setSessionTokens } from './tokenSessionStore';
import type { LoginData } from '../../types/loginData';
import { AccountOperationIntent } from '../../utils/accountOperationIntent';
import { recordAccountOperationResponse } from '../../utils/accountOperationState';
import { settleOwnConsultantIdentityMutation } from '../../utils/settleOwnConsultantIdentityMutation';
import {
    ACCESS_TOKEN_VALID_UNTIL_KEY,
    REFRESH_TOKEN_VALID_UNTIL_KEY,
    setTokenExpiryInLocalStorage,
} from './accessSessionLocalStorage';

vi.mock('./authBffClient', () => ({
    refreshAuthTokensViaBff: vi.fn(),
    clearAuthTokensViaBff: vi.fn(),
    bootstrapAuthSessionViaBff: vi.fn(),
    setAuthTokensViaBff: vi.fn(),
}));
vi.mock('./logout', () => ({ default: vi.fn() }));

const token = (sub: string, revision: number) =>
    `e30.${btoa(JSON.stringify({ iss: 'https://auth.example.test', sub, revision }))}.test`;
const response = (sub: string, revision: number): LoginData => ({
    data: {},
    access_token: token(sub, revision),
    refresh_token: `synthetic-refresh-${revision}`,
    expires_in: 300,
    refresh_expires_in: 600,
});
const deferred = () => {
    let resolve!: (value: LoginData) => void;
    const promise = new Promise<LoginData>((done) => {
        resolve = done;
    });
    return { promise, resolve };
};

beforeEach(() => {
    vi.mocked(refreshAuthTokensViaBff).mockReset();
    vi.mocked(clearAuthTokensViaBff).mockReset().mockResolvedValue(undefined);
    vi.mocked(setAuthTokensViaBff).mockReset();
    clearSessionTokens();
    localStorage.clear();
    setSessionTokens(token('original', 1), 'synthetic-original-refresh');
});

describe('actual refresh session ownership', () => {
    it.each([403, 503])('recovers an unknown own mutation after an older refresh for status %s', async (status) => {
        const older = deferred();
        const afterMutation = deferred();
        vi.mocked(refreshAuthTokensViaBff)
            .mockReturnValueOnce(older.promise)
            .mockReturnValueOnce(afterMutation.promise);
        const beforeMutation = tryRefreshAccessToken();
        const intent = new AccountOperationIntent('11111111-1111-4111-8111-111111111111');
        const observedTokens: string[] = [];
        const observedKeys: string[] = [];
        const error = new Error('Synthetic lost role-changing reply');
        recordAccountOperationResponse(error, new Response(null, { status }));
        const send = async () => {
            observedTokens.push(getSessionAccessToken());
            observedKeys.push(intent.headersFor('DELETE', '/consultants/original')['Idempotency-Key']);
            if (observedTokens.length === 1) throw error;
            if (getSessionAccessToken() !== token('original', 3))
                throw new Error('Pre-mutation roles cannot read receipt');
            return 'committed-receipt';
        };
        const recovery = settleOwnConsultantIdentityMutation('original', intent, send, { recoverOwnIdentity: true });
        const outcome = recovery.then(
            (value) => ({ value }),
            (failure) => ({ failure }),
        );
        older.resolve(response('original', 2));
        afterMutation.resolve(response('original', 3));
        await expect(beforeMutation).resolves.toBe(true);
        await expect(outcome).resolves.toEqual({ value: 'committed-receipt' });
        expect(observedTokens).toEqual([token('original', 1), token('original', 3)]);
        expect(observedKeys).toEqual([intent.id, intent.id]);
        expect(getSessionAccessToken()).toBe(token('original', 3));
    });

    it('keeps one in-flight request for ordinary same-person callers', async () => {
        const pending = deferred();
        vi.mocked(refreshAuthTokensViaBff).mockReturnValue(pending.promise);
        const first = tryRefreshAccessToken();
        const second = tryRefreshAccessToken();
        expect(second).toBe(first);
        pending.resolve(response('original', 2));
        await expect(first).resolves.toBe(true);
        expect(getSessionAccessToken()).toBe(token('original', 2));
        expect(refreshAuthTokensViaBff).toHaveBeenCalledTimes(1);
        expect(clearAuthTokensViaBff).not.toHaveBeenCalled();
    });

    it('fails closed instead of installing a delayed refresh over a replacement person', async () => {
        const pending = deferred();
        vi.mocked(refreshAuthTokensViaBff).mockReturnValue(pending.promise);
        const refreshing = tryRefreshAccessToken();
        setSessionTokens(token('replacement', 1), 'synthetic-replacement-refresh');
        pending.resolve(response('original', 2));
        await expect(refreshing).resolves.toBe(false);
        expect(getSessionAccessToken()).toBe('');
        expect(clearAuthTokensViaBff).toHaveBeenCalledTimes(1);
    });

    it('starts a fresh role read after an older in-flight refresh has settled', async () => {
        const older = deferred();
        vi.mocked(refreshAuthTokensViaBff)
            .mockReturnValueOnce(older.promise)
            .mockResolvedValueOnce(response('original', 3));
        const beforeReceipt = tryRefreshAccessToken();
        const afterReceipt = tryRefreshAccessToken({ afterInFlight: true });
        expect(refreshAuthTokensViaBff).toHaveBeenCalledTimes(1);
        older.resolve(response('original', 2));
        await expect(beforeReceipt).resolves.toBe(true);
        await expect(afterReceipt).resolves.toBe(true);
        expect(refreshAuthTokensViaBff).toHaveBeenCalledTimes(2);
        expect(getSessionAccessToken()).toBe(token('original', 3));
    });

    it('does not start the later role read after the waiting person changed', async () => {
        const older = deferred();
        vi.mocked(refreshAuthTokensViaBff).mockReturnValueOnce(older.promise);
        const beforeReceipt = tryRefreshAccessToken();
        const afterReceipt = tryRefreshAccessToken({ afterInFlight: true });
        setSessionTokens(token('replacement', 1), 'synthetic-replacement-refresh');
        older.resolve(response('original', 2));
        await expect(beforeReceipt).resolves.toBe(false);
        await expect(afterReceipt).resolves.toBe(false);
        expect(refreshAuthTokensViaBff).toHaveBeenCalledTimes(1);
        expect(getSessionAccessToken()).toBe('');
    });

    it('waits for a real mounted renewal timer before refreshing the acknowledged role change', async () => {
        vi.useFakeTimers();
        try {
            setTokenExpiryInLocalStorage(ACCESS_TOKEN_VALID_UNTIL_KEY, 20);
            setTokenExpiryInLocalStorage(REFRESH_TOKEN_VALID_UNTIL_KEY, 100);
            const older = deferred();
            vi.mocked(refreshAuthTokensViaBff)
                .mockReturnValueOnce(older.promise)
                .mockResolvedValueOnce(response('original', 3));
            await handleTokenRefresh();
            await vi.advanceTimersByTimeAsync(10_000);
            expect(refreshAuthTokensViaBff).toHaveBeenCalledTimes(1);
            const afterReceipt = tryRefreshAccessToken({ afterInFlight: true });
            expect(refreshAuthTokensViaBff).toHaveBeenCalledTimes(1);
            older.resolve(response('original', 2));
            await expect(afterReceipt).resolves.toBe(true);
            expect(refreshAuthTokensViaBff).toHaveBeenCalledTimes(2);
            expect(getSessionAccessToken()).toBe(token('original', 3));
            expect(setAuthTokensViaBff).not.toHaveBeenCalled();
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });
});
