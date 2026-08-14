import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FETCH_METHODS } from '../fetchData';
import { publicAccountInvitesEndpoint, tenantAdminEndpoint } from '../../appConfig';
import { InviteLinkError } from './tenantOnboarding';
import {
    createHttpDpaForwardClient,
    createStubDpaForwardClient,
    getActiveDpaForward,
    resolveDpaForwardSignLink,
} from './dpaForward';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');

    return {
        ...actual,
        fetchData: mocks.fetchData,
    };
});

beforeEach(() => {
    mocks.fetchData.mockReset();
});

describe('resolveDpaForwardSignLink', () => {
    it('resolves a relative sign path against the configured App origin', () => {
        expect(resolveDpaForwardSignLink('/dpa-sign/token-value', 'https://app.oriso-dev.site')).toBe(
            'https://app.oriso-dev.site/dpa-sign/token-value',
        );
    });

    it('keeps an absolute sign URL on its own origin', () => {
        expect(
            resolveDpaForwardSignLink('https://sign.example.org/dpa-sign/token-value', 'https://app.oriso-dev.site'),
        ).toBe('https://sign.example.org/dpa-sign/token-value');
    });
});

describe('createHttpDpaForwardClient', () => {
    it('creates the forward invite through the public-token endpoint without auth', async () => {
        const invite = { signLink: '/dpa-sign/fresh', expiresAt: '2026-08-28T12:00:00Z' };
        mocks.fetchData.mockResolvedValue(invite);

        const result = await createHttpDpaForwardClient().createForwardInvite('raw token');

        expect(result).toEqual(invite);
        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/raw%20token/onboarding/dpa/forward`,
                method: FETCH_METHODS.POST,
                skipAuth: true,
            }),
        );
    });

    it('sends the forward mail with recipient e-mail and name through the public endpoint', async () => {
        mocks.fetchData.mockResolvedValue(new Response(null, { status: 204 }));

        await createHttpDpaForwardClient().sendForwardEmail('tok', {
            recipientEmail: 'legal@example.org',
            recipientName: 'Dr. Ruth Recht',
        });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/tok/onboarding/dpa/forward/email`,
                method: FETCH_METHODS.POST,
                skipAuth: true,
                bodyData: JSON.stringify({ recipientEmail: 'legal@example.org', recipientName: 'Dr. Ruth Recht' }),
            }),
        );
    });

    it.each([
        [404, 'INVALID'],
        [409, 'CONSUMED'],
        [410, 'EXPIRED'],
        [423, 'REVOKED'],
    ] as const)('maps a %i response to InviteLinkError(%s)', async (status, reason) => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status }));

        await expect(createHttpDpaForwardClient().createForwardInvite('tok')).rejects.toMatchObject(
            new InviteLinkError(reason),
        );
    });

    it('keeps other failures generic and retryable', async () => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status: 502 }));

        await expect(createHttpDpaForwardClient().sendForwardEmail('tok', { recipientEmail: 'a@b.cd' })).rejects.toThrow(
            'DPA_FORWARD_HTTP_502',
        );
    });
});

describe('getActiveDpaForward', () => {
    it('returns the active forward of the tenant', async () => {
        const forward = { signLink: '/dpa-sign/active', expiresAt: null, recipientEmail: 'legal@example.org' };
        mocks.fetchData.mockResolvedValue(forward);

        await expect(getActiveDpaForward(21)).resolves.toEqual(forward);
        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({ url: `${tenantAdminEndpoint}/21/dpa/forward`, skipAuth: false }),
        );
    });

    it('maps 404 (no forward ever declared) to null instead of an error', async () => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status: 404 }));

        await expect(getActiveDpaForward(21)).resolves.toBeNull();
    });

    it('rejects on every other failure so the gate can fail closed', async () => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status: 500 }));

        await expect(getActiveDpaForward(21)).rejects.toBeInstanceOf(Response);
    });
});

describe('createStubDpaForwardClient', () => {
    it('returns the same link on repeated creation (idempotent declaration)', async () => {
        const stub = createStubDpaForwardClient();

        const first = await stub.createForwardInvite('tok');
        const second = await stub.createForwardInvite('tok');

        expect(second).toEqual(first);
        expect(first.signLink).toContain('/dpa-sign/');
    });

    it('rejects both calls in the failing variant', async () => {
        const stub = createStubDpaForwardClient({ failing: true });

        await expect(stub.createForwardInvite('tok')).rejects.toThrow();
        await expect(stub.sendForwardEmail('tok', { recipientEmail: 'a@b.cd' })).rejects.toThrow();
    });
});
