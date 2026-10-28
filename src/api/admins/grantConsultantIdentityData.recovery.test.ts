import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grantConsultantIdentityData } from './grantConsultantIdentityData';
import { AccountOperationIntent } from '../../utils/accountOperationIntent';
import { getSessionAccessToken, setSessionTokens } from '../auth/tokenSessionStore';
import { tryRefreshAccessToken } from '../auth/auth';
import { deleteCounselorData } from '../counselor/deleteCounselorData';

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
    setSessionTokens(token('self-admin', 1), 'test-refresh');
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
])('actual own consultant identity $name recovery', ({ method, invoke }) => {
    it.each([403, 503])('renews once after unknown %s and replays the exact body and UUID', async (status) => {
        fetchMock
            .mockResolvedValueOnce(new Response(null, { status }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('self-admin', 2), 'test-refresh');
            return true;
        });
        const intent = new AccountOperationIntent();
        await invoke('self-admin', intent);
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
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
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        const replay = new Request(...fetchMock.mock.calls[1]);
        expect(replay.headers.get('Idempotency-Key')).toBe(intent.id);
    });
});
