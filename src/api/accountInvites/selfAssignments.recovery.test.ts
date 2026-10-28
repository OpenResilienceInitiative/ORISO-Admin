import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { message } from 'antd';
import { createSelfAssignment } from './selfAssignments';
import { AccountOperationIntent } from '../../utils/accountOperationIntent';
import { getSessionAccessToken, setSessionTokens } from '../auth/tokenSessionStore';
import { tryRefreshAccessToken } from '../auth/auth';
import logout from '../auth/logout';

vi.mock('../auth/auth', async () => {
    const store = await import('../auth/tokenSessionStore');
    return { getAccessTokenForRequests: () => store.getSessionAccessToken(), tryRefreshAccessToken: vi.fn() };
});
vi.mock('../auth/logout', () => ({ default: vi.fn() }));

const token = (sub: string, revision: number) =>
    `e30.${btoa(JSON.stringify({ sub, iss: 'https://auth.example.test', revision }))}.test`;
const fetchMock = vi.fn<typeof fetch>();
const input = { role: 'COUNSELLOR' as const, agencyId: 12, topicIds: [3] };
const result = { ...input, userId: 'self-admin', consultantIdentityCreated: true };
const success = () => new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.mocked(tryRefreshAccessToken).mockReset();
    vi.mocked(logout).mockClear();
    setSessionTokens(token('self-admin', 1), 'test-refresh');
});
afterEach(() => {
    vi.unstubAllGlobals();
    setSessionTokens(null, null);
});

describe('own Consultant identity through self-assignment', () => {
    it('does not show a failure notice for an uncertain reply that recovers successfully', async () => {
        const notice = vi.spyOn(message, 'error');
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(success());
        vi.mocked(tryRefreshAccessToken).mockResolvedValue(true);
        try {
            await expect(createSelfAssignment(input, new AccountOperationIntent())).resolves.toEqual(result);
            expect(notice).not.toHaveBeenCalled();
        } finally {
            notice.mockRestore();
        }
    });

    it.each([403, 503])(
        'recovers an uncertain %s with fresh same-human authority and the original request',
        async (status) => {
            const intent = new AccountOperationIntent();
            fetchMock.mockResolvedValueOnce(new Response(null, { status })).mockResolvedValueOnce(success());
            let revision = 1;
            vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
                revision += 1;
                setSessionTokens(token('self-admin', revision), 'test-refresh');
                return true;
            });

            await expect(createSelfAssignment(input, intent)).resolves.toEqual(result);

            expect(fetchMock).toHaveBeenCalledTimes(2);
            const first = new Request(...fetchMock.mock.calls[0]);
            const retry = new Request(...fetchMock.mock.calls[1]);
            expect(retry.url).toBe(first.url);
            expect(retry.method).toBe('POST');
            expect(await retry.text()).toBe(await first.text());
            expect(first.headers.get('Idempotency-Key')).toBe(intent.id);
            expect(retry.headers.get('Idempotency-Key')).toBe(intent.id);
            expect(first.headers.get('Authorization')).toBe(`Bearer ${token('self-admin', 1)}`);
            expect(retry.headers.get('Authorization')).toBe(`Bearer ${token('self-admin', 2)}`);
            expect(tryRefreshAccessToken).toHaveBeenCalledTimes(2);
            expect(getSessionAccessToken()).toBe(token('self-admin', 3));
        },
    );

    it('renews a known successful grant before resolving it and never resends that POST', async () => {
        fetchMock.mockResolvedValueOnce(success());
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('self-admin', 2), 'test-refresh');
            return true;
        });

        await expect(createSelfAssignment(input, new AccountOperationIntent())).resolves.toEqual(result);

        expect(tryRefreshAccessToken).toHaveBeenCalledExactlyOnceWith({ afterInFlight: true });
        expect(getSessionAccessToken()).toBe(token('self-admin', 2));
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('keeps the known success when renewal fails and returns to sign-in without another grant', async () => {
        fetchMock.mockResolvedValueOnce(success());
        vi.mocked(tryRefreshAccessToken).mockResolvedValue(false);

        await expect(createSelfAssignment(input, new AccountOperationIntent())).resolves.toEqual(result);

        expect(logout).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not replay an unresolved grant under a replacement person', async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
        vi.mocked(tryRefreshAccessToken).mockImplementation(async () => {
            setSessionTokens(token('another-admin', 2), 'other-refresh');
            return true;
        });

        await expect(createSelfAssignment(input, new AccountOperationIntent())).rejects.toThrow(
            'REQUEST_IDENTITY_CHANGED',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(logout).not.toHaveBeenCalled();
    });

    it('does not renew or resend a verified refusal of the original operation', async () => {
        const intent = new AccountOperationIntent();
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 403,
                headers: {
                    'X-ORISO-Mutation-Outcome': 'NO_EFFECT',
                    'X-ORISO-Mutation-Operation': intent.id,
                },
            }),
        );

        await expect(createSelfAssignment(input, intent)).rejects.toBeDefined();

        expect(tryRefreshAccessToken).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
