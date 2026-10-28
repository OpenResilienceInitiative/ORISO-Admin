import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grantConsultantIdentityData } from './grantConsultantIdentityData';
import { AccountOperationIntent } from '../../utils/accountOperationIntent';
import { getSessionAccessToken, setSessionTokens } from '../auth/tokenSessionStore';
import { tryRefreshAccessToken } from '../auth/auth';
import { deleteCounselorData } from '../counselor/deleteCounselorData';
import logout from '../auth/logout';

vi.mock('../auth/auth', async () => {
    const store = await import('../auth/tokenSessionStore');
    return { getAccessTokenForRequests: () => store.getSessionAccessToken(), tryRefreshAccessToken: vi.fn() };
});
vi.mock('../auth/logout', () => ({ default: vi.fn() }));

const token = (sub: string, revision: number, iss = 'https://auth.example.test') =>
    `e30.${btoa(JSON.stringify({ sub, iss, revision }))}.test`;
const fetchMock = vi.fn<typeof fetch>();
const input = { agencyIds: ['10'], topicIds: ['20'] };

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.mocked(tryRefreshAccessToken).mockReset();
    vi.mocked(logout).mockClear();
    setSessionTokens(token('self-admin', 1), 'test-refresh');
});

describe('known successful own Consultant removal', () => {
    it('renews before resolving the successful result without another DELETE', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('self-admin', 2), 'test-refresh');
            return true;
        });
        const result = await deleteCounselorData('self-admin', false, new AccountOperationIntent());
        expect(result.status).toBe(204);
        expect(getSessionAccessToken()).toBe(token('self-admin', 2));
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(logout).not.toHaveBeenCalled();
    });

    it('keeps the acknowledged success and returns to login when renewal fails', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockResolvedValue(false);
        await expect(deleteCounselorData('self-admin', false, new AccountOperationIntent())).resolves.toMatchObject({
            status: 204,
        });
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(logout).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not refresh or log out a person who replaced the session during the successful DELETE', async () => {
        fetchMock.mockImplementation(async () => {
            setSessionTokens(token('another-person', 2), 'other-refresh');
            return new Response(null, { status: 204 });
        });
        await expect(deleteCounselorData('self-admin', false, new AccountOperationIntent())).rejects.toThrow(
            'REQUEST_IDENTITY_CHANGED',
        );
        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(logout).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry the acknowledged replay when its later session renewal fails', async () => {
        fetchMock
            .mockResolvedValueOnce(new Response(null, { status: 503 }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        await expect(deleteCounselorData('self-admin', false, new AccountOperationIntent())).resolves.toMatchObject({
            status: 204,
        });
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(2);
        expect(logout).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each([
        ['another-person', 'https://auth.example.test'],
        ['self-admin', 'https://other.example.test'],
    ])('refuses changed success-callback ownership %s / %s without replay or logout', async (sub, iss) => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token(sub, 2, iss), 'test-refresh');
            return true;
        });
        await expect(deleteCounselorData('self-admin', false, new AccountOperationIntent())).rejects.toThrow(
            'REQUEST_IDENTITY_CHANGED',
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(logout).not.toHaveBeenCalled();
    });

    it.each(['peer', 'legacy'] as const)('does not renew a successful %s removal', async (kind) => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        await deleteCounselorData(
            kind === 'peer' ? 'someone-else' : 'self-admin',
            false,
            kind === 'peer' ? new AccountOperationIntent() : undefined,
        );
        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('preserves the existing successful own-grant re-login behavior', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        await grantConsultantIdentityData('self-admin', input, new AccountOperationIntent(), { recoverOwnGrant: true });
        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe.each([
    {
        name: 'grant',
        method: 'POST',
        invoke: (target: string, intent?: AccountOperationIntent) =>
            grantConsultantIdentityData(target, input, intent, { recoverOwnGrant: true }),
    },
    {
        name: 'removal',
        method: 'DELETE',
        invoke: (target: string, intent?: AccountOperationIntent) => deleteCounselorData(target, false, intent),
    },
])('actual own consultant identity $name recovery', ({ name, method, invoke }) => {
    it.each([403, 503])('recovers unknown %s once and replays the exact body and UUID', async (status) => {
        fetchMock
            .mockResolvedValueOnce(new Response(null, { status }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('self-admin', 2), 'test-refresh');
            return true;
        });
        const intent = new AccountOperationIntent();
        await invoke('self-admin', intent);
        // Removal renews again after the receipt: this replay may have been the
        // first attempt to commit. The successful DELETE itself is never replayed.
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(name === 'removal' ? 2 : 1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [first, replay] = fetchMock.mock.calls.map(([request, init]) => new Request(request, init));
        expect(first.method).toBe(method);
        expect(replay.url).toBe(first.url);
        expect(await replay.clone().text()).toBe(await first.clone().text());
        expect(new Headers(first.headers).get('Idempotency-Key')).toBe(intent.id);
        expect(new Headers(replay.headers).get('Idempotency-Key')).toBe(intent.id);
        expect(new Headers(replay.headers).get('Authorization')).toBe(`Bearer ${getSessionAccessToken()}`);
    });

    it('does not renew or replay a matching committed NO_EFFECT refusal', async () => {
        const intent = new AccountOperationIntent();
        fetchMock.mockResolvedValue(
            new Response(null, {
                status: 403,
                headers: {
                    'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                    'X-ORISO-Mutation-Operation': intent.id,
                },
            }),
        );
        await expect(invoke('self-admin', intent)).rejects.toBeInstanceOf(Response);
        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['another-person', 'https://auth.example.test'],
        ['self-admin', 'https://other.example.test'],
    ])('refuses renewed ownership %s / %s before another write', async (sub, iss) => {
        fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token(sub, 2, iss), 'test-refresh');
            return true;
        });
        await expect(invoke('self-admin', new AccountOperationIntent())).rejects.toThrow('REQUEST_IDENTITY_CHANGED');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not loop when the renewed replay is still unknown', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
        vi.mocked(tryRefreshAccessToken).mockResolvedValue(true);
        await expect(invoke('self-admin', new AccountOperationIntent())).rejects.toThrow();
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not renew the signed-in person for a different target', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
        await expect(invoke('someone-else', new AccountOperationIntent())).rejects.toThrow();
        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('keeps legacy transport without automatic role renewal when no scoped intent exists', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
        await expect(invoke('self-admin')).rejects.toThrow();
        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const request = new Request(...fetchMock.mock.calls[0]);
        expect(request.headers.has('Idempotency-Key')).toBe(false);
    });

    it('does not accept another operation ID as a committed refusal', async () => {
        const intent = new AccountOperationIntent();
        fetchMock
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 403,
                    headers: {
                        'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                        'X-ORISO-Mutation-Operation': new AccountOperationIntent().id,
                    },
                }),
            )
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockResolvedValue(true);
        await invoke('self-admin', intent);
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(name === 'removal' ? 2 : 1);
        const replay = new Request(...fetchMock.mock.calls[1]);
        expect(replay.headers.get('Idempotency-Key')).toBe(intent.id);
    });
});
