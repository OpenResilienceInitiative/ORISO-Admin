import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import { publicAccountInvitesEndpoint } from '../../appConfig';
import { InviteLinkError } from './tenantOnboarding';
import {
    createHttpDpaForwardClient,
    createStubDpaForwardClient,
    DpaForwardError,
    isAwaitingForwardedSignature,
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

const SIGN_URL = 'https://app.example.org/dpa-sign/8Kd2';
const RESPONSE = { signUrl: SIGN_URL, expiresAt: '2026-08-29T14:31:07' };

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
    it('mints a link-only forward against the public UserService endpoint without auth', async () => {
        mocks.fetchData.mockResolvedValue(RESPONSE);

        const outcome = await createHttpDpaForwardClient().forward('raw token');

        expect(outcome).toEqual({ link: { signUrl: SIGN_URL, expiresAt: RESPONSE.expiresAt }, mailFailed: false });
        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/raw%20token/onboarding/dpa-forward`,
                method: FETCH_METHODS.POST,
                skipAuth: true,
                bodyData: JSON.stringify({}),
            }),
        );
    });

    /**
     * #712 regression. `fetchData` routes a 401 on a credentialled call into
     * refresh → `logout()` → `/admin/login`. The forward endpoints are reached
     * from the PUBLIC onboarding wizard, where that redirect throws an anonymous
     * visitor off the page mid-task, so every call from this client has to
     * declare itself credential-free (`skipAuth`) and handle its own failures
     * (`CATCH_ALL_SILENT`) instead of letting the global handlers navigate.
     * `FORBIDDEN_SILENT` is the same rule for the 403 → `/admin/access-denied`
     * redirect. This is the mechanism the admin-only preview call lacked.
     */
    it.each([[undefined], [{ recipientEmail: 'legal@example.org' }]])(
        'declares every public forward call credential-free and non-navigating (%o)',
        async (request) => {
            mocks.fetchData.mockResolvedValue(RESPONSE);

            await createHttpDpaForwardClient().forward('tok', request);

            const call = mocks.fetchData.mock.calls[0][0];
            expect(call.skipAuth).toBe(true);
            expect(call.responseHandling).toContain(FETCH_ERRORS.CATCH_ALL_SILENT);
            expect(call.responseHandling).toContain(FETCH_ERRORS.FORBIDDEN_SILENT);
            // Nothing that would let the global handlers redirect instead.
            expect(call.responseHandling).not.toContain(FETCH_ERRORS.CATCH_ALL);
            expect(call.responseHandling).not.toContain(FETCH_ERRORS.FORBIDDEN);
        },
    );

    it('sends the DPA_FORWARD mail when a recipient is given', async () => {
        mocks.fetchData.mockResolvedValue(RESPONSE);

        await createHttpDpaForwardClient().forward('tok', { recipientEmail: 'legal@example.org' });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/tok/onboarding/dpa-forward`,
                bodyData: JSON.stringify({ recipientEmail: 'legal@example.org' }),
            }),
        );
    });

    it('carries the recipient name on the wire with the send (#842)', async () => {
        mocks.fetchData.mockResolvedValue(RESPONSE);

        await createHttpDpaForwardClient().forward('tok', {
            recipientEmail: 'legal@example.org',
            recipientName: 'Dr. Ruth Recht',
        });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                bodyData: JSON.stringify({ recipientEmail: 'legal@example.org', recipientName: 'Dr. Ruth Recht' }),
            }),
        );
    });

    it('reports the mail failure from the first response without minting a second link', async () => {
        // Every forward call mints a NEW link, and only five may be outstanding
        // at once. The old 502 fallback made a second call to obtain a link, so
        // one failed send cost two of the five. The flag now rides in the first
        // response and there is no second call to make.
        mocks.fetchData.mockResolvedValueOnce({ ...RESPONSE, mailSent: false });

        const outcome = await createHttpDpaForwardClient().forward('tok', { recipientEmail: 'legal@example.org' });

        expect(outcome.mailFailed).toBe(true);
        expect(outcome.link.signUrl).toBe(RESPONSE.signUrl);
        expect(mocks.fetchData).toHaveBeenCalledTimes(1);
    });

    it('treats a server that omits mailSent as "not sent" rather than a silent success', async () => {
        // Failing towards "show the link" is safe; the opposite default would
        // claim a delivery that never happened and hide the link.
        mocks.fetchData.mockResolvedValueOnce({ ...RESPONSE });

        const outcome = await createHttpDpaForwardClient().forward('tok', { recipientEmail: 'legal@example.org' });

        expect(outcome.mailFailed).toBe(true);
    });

    it('never reports a mail failure for a link-only call', async () => {
        // No recipient means no mail was asked for, so there is nothing to fail.
        mocks.fetchData.mockResolvedValueOnce({ ...RESPONSE });

        const outcome = await createHttpDpaForwardClient().forward('tok');

        expect(outcome.mailFailed).toBe(false);
    });

    it.each([
        // 400 is TECHNICAL on purpose: it used to claim the address was
        // invalid for any server-side rejection (owner report 2026-08-19).
        [400, 'TECHNICAL'],
        [404, 'UNKNOWN_TOKEN'],
        [409, 'NO_DPA_PUBLISHED'],
        [429, 'TOO_MANY_LINKS'],
        [500, 'TECHNICAL'],
    ] as const)('maps %i to DpaForwardError(%s)', async (status, kind) => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status }));

        const error = await createHttpDpaForwardClient()
            .forward('tok')
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(DpaForwardError);
        expect((error as DpaForwardError).kind).toBe(kind);
    });

    it.each(['CONSUMED', 'REVOKED', 'EXPIRED', 'SUPERSEDED'] as const)(
        'maps a 410 with reason %s body-first',
        async (reason) => {
            mocks.fetchData.mockRejectedValue(new Response(JSON.stringify({ reason }), { status: 410 }));

            await expect(createHttpDpaForwardClient().forward('tok')).rejects.toMatchObject(
                new InviteLinkError(reason),
            );
        },
    );

    // SUPERSEDED keeps its own reason since the owner's stale-tab case
    // (2026-08-31) — only NOT_ACTIVE still collapses onto INVALID.
    it.each(['NOT_ACTIVE'] as const)('collapses the %s link death onto the terminal invalid state', async (reason) => {
        mocks.fetchData.mockRejectedValue(new Response(JSON.stringify({ reason }), { status: 410 }));

        await expect(createHttpDpaForwardClient().forward('tok')).rejects.toMatchObject(new InviteLinkError('INVALID'));
    });
});

describe('isAwaitingForwardedSignature', () => {
    it('is true for the gate DTO when a forward is pending and nothing is signed', () => {
        expect(isAwaitingForwardedSignature({ dpaSigned: false, dpaForwardPending: true })).toBe(true);
    });

    it('never softens a signed tenant', () => {
        expect(isAwaitingForwardedSignature({ dpaSigned: true, dpaForwardPending: true })).toBe(false);
    });

    it('is true for the status DTO on UNSIGNED/OUTDATED with the additive flag', () => {
        expect(isAwaitingForwardedSignature({ status: 'UNSIGNED', forwardPending: true })).toBe(true);
        expect(isAwaitingForwardedSignature({ status: 'OUTDATED', forwardPending: true })).toBe(true);
    });

    it('ignores the flag for states it may never mask', () => {
        expect(isAwaitingForwardedSignature({ status: 'VALID', forwardPending: true })).toBe(false);
        expect(isAwaitingForwardedSignature({ status: 'MISSING', forwardPending: true })).toBe(false);
        expect(isAwaitingForwardedSignature({ status: 'INCONSISTENT', forwardPending: true })).toBe(false);
    });

    it('is false when the flag is absent (older backend)', () => {
        expect(isAwaitingForwardedSignature({ status: 'UNSIGNED' })).toBe(false);
    });
});

describe('createStubDpaForwardClient', () => {
    it('returns a link and reports no mail failure by default', async () => {
        const outcome = await createStubDpaForwardClient().forward('tok', { recipientEmail: 'a@b.cd' });

        expect(outcome.link.signUrl).toContain('/dpa-sign/');
        expect(outcome.mailFailed).toBe(false);
    });

    it('reports the mail failure only when a recipient was actually given', async () => {
        const stub = createStubDpaForwardClient({ mailFails: true });

        expect((await stub.forward('tok')).mailFailed).toBe(false);
        expect((await stub.forward('tok', { recipientEmail: 'a@b.cd' })).mailFailed).toBe(true);
    });

    it('rejects with the configured typed failure', async () => {
        const stub = createStubDpaForwardClient({ failWith: 'NO_DPA_PUBLISHED' });

        await expect(stub.forward('tok')).rejects.toMatchObject({ kind: 'NO_DPA_PUBLISHED' });
    });
});
