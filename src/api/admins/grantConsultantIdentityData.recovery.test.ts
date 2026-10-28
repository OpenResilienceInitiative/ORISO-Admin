import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grantConsultantIdentityData } from './grantConsultantIdentityData';
import { AccountOperationIntent } from '../../utils/accountOperationIntent';
import { getSessionAccessToken, setSessionTokens } from '../auth/tokenSessionStore';
import { tryRefreshAccessToken } from '../auth/auth';

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

describe('actual self-grant transport recovery', () => {
    it.each([403, 503])('renews once after unknown %s and replays the exact body and UUID', async (status) => {
        fetchMock
            .mockResolvedValueOnce(new Response(null, { status }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('self-admin', 2), 'test-refresh');
            return true;
        });
        const intent = new AccountOperationIntent();
        await grantConsultantIdentityData('self-admin', input, intent, { recoverOwnGrant: true });
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [first, replay] = fetchMock.mock.calls.map(([request, init]) => new Request(request, init));
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
        await expect(
            grantConsultantIdentityData('self-admin', input, intent, { recoverOwnGrant: true }),
        ).rejects.toBeInstanceOf(Response);
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
        await expect(
            grantConsultantIdentityData('self-admin', input, new AccountOperationIntent(), { recoverOwnGrant: true }),
        ).rejects.toThrow('REQUEST_IDENTITY_CHANGED');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not loop when the renewed replay is still unknown', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
        vi.mocked(tryRefreshAccessToken).mockResolvedValue(true);
        await expect(
            grantConsultantIdentityData('self-admin', input, new AccountOperationIntent(), { recoverOwnGrant: true }),
        ).rejects.toThrow();
        expect(tryRefreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not apply self-grant renewal to a different target', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
        await expect(
            grantConsultantIdentityData('someone-else', input, new AccountOperationIntent(), { recoverOwnGrant: true }),
        ).rejects.toThrow();
        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
