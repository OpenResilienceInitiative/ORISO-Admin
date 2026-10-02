import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeExistingAccountSetup, InviteLinkError } from './tenantOnboarding';
import { publicAccountInvitesEndpoint } from '../../appConfig';

vi.mock('../auth/auth', () => ({
    getAccessTokenForRequests: () => 'stale-browser-session',
    tryRefreshAccessToken: vi.fn(),
}));

class RecordingRequest {
    readonly headers: Headers;

    constructor(readonly url: string, readonly init: RequestInit) {
        this.headers = new Headers(init.headers);
    }
}

const recordResponse = (response: Response) => {
    vi.stubGlobal('Request', RecordingRequest);
    const http = vi.fn<(request: RecordingRequest) => Promise<Response>>().mockResolvedValue(response);
    vi.stubGlobal('fetch', http);
    return http;
};

afterEach(() => vi.unstubAllGlobals());

describe('existing account setup through the real public HTTP transport', () => {
    it('posts only the chosen password with an encoded token and no browser bearer', async () => {
        const http = recordResponse(
            new Response(JSON.stringify({ phase: 'COMPLETED' }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );

        await completeExistingAccountSetup('opaque/token value', 'Aa1!bbbb');

        expect(http).toHaveBeenCalledOnce();
        const [request] = http.mock.calls[0];
        expect(request.url).toBe(`${publicAccountInvitesEndpoint}/opaque%2Ftoken%20value/setup`);
        expect(request.init.method).toBe('POST');
        expect(request.headers.get('Content-Type')).toBe('application/json');
        expect(request.headers.has('Authorization')).toBe(false);
        expect(JSON.parse(String(request.init.body))).toEqual({ password: 'Aa1!bbbb' });
    });

    it.each([
        'REVOKED',
        'EXPIRED',
        'SUPERSEDED',
        'CONSUMED',
        'SETUP_IN_PROGRESS',
        'SETUP_OPERATOR_REVIEW_REQUIRED',
    ] as const)('keeps a %s setup link terminal', async (reason) => {
        const http = recordResponse(new Response(JSON.stringify({ reason }), { status: 410 }));
        await expect(completeExistingAccountSetup('dead-token', 'Aa1!bbbb')).rejects.toEqual(
            new InviteLinkError(reason),
        );
        expect(http).toHaveBeenCalledOnce();
    });

    it.each([403, 502])('does not report successful password setup on HTTP %i', async (status) => {
        recordResponse(new Response(null, { status }));
        await expect(completeExistingAccountSetup('opaque', 'Aa1!bbbb')).rejects.toThrow();
    });

    it('rejects an incomplete success body rather than inventing completion or public 2FA', async () => {
        recordResponse(new Response(JSON.stringify({ phase: 'PENDING_2FA_ACTIVATION' }), { status: 200 }));
        await expect(completeExistingAccountSetup('opaque', 'Aa1!bbbb')).rejects.toThrow('ACCOUNT_SETUP_INCOMPLETE');
    });
});
