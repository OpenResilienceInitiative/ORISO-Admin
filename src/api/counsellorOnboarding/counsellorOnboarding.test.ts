import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_METHODS } from '../fetchData';
import { publicAccountInvitesEndpoint } from '../../appConfig';
import {
    CounsellorRegistrationRequest,
    createHttpCounsellorOnboardingClient,
    createStubCounsellorOnboardingClient,
    InviteLinkError,
    STUB_REJECTED_OTP,
    TwoFactorCodeInvalidError,
} from './counsellorOnboarding';

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

const registration = (topicIds: number[]): CounsellorRegistrationRequest => ({
    account: { username: 'lena.b', password: 'SecurePass1!' },
    person: { salutation: 'counsellor_female', position: 'Leitung', title: 'Dipl.-Soz.Päd.' },
    names: { publicName: 'Lena', internalDisplayName: 'Lena B. (Nord)' },
    topicIds,
});

describe('createStubCounsellorOnboardingClient', () => {
    it('registers once within the topic coverage and returns the 2FA setup material', async () => {
        const client = createStubCounsellorOnboardingClient({ latencyMs: 0 });
        const invite = await client.getOnboardingInvite('raw-token');

        const result = await client.registerCounsellor('raw-token', registration([invite.topics[0].id]));

        expect(result.consultantId).toBeTruthy();
        expect(result.phase).toBe('PENDING_2FA_ACTIVATION');
        expect(result.twoFactor?.secret).toBeTruthy();
    });

    it('rejects topic selections outside the invite coverage', async () => {
        const client = createStubCounsellorOnboardingClient({ latencyMs: 0 });
        await client.getOnboardingInvite('raw-token');

        await expect(client.registerCounsellor('raw-token', registration([999]))).rejects.toThrow(
            'TOPICS_OUTSIDE_COVERAGE',
        );
    });

    it('consumes the link atomically: the second registration fails with CONSUMED', async () => {
        const client = createStubCounsellorOnboardingClient({ latencyMs: 0 });
        const invite = await client.getOnboardingInvite('raw-token');
        await client.registerCounsellor('raw-token', registration([invite.topics[0].id]));

        await expect(client.registerCounsellor('raw-token', registration([invite.topics[0].id]))).rejects.toMatchObject(
            { reason: 'CONSUMED' },
        );
    });

    it('keeps a registered-but-2FA-pending link resumable, then consumes it after activation', async () => {
        const client = createStubCounsellorOnboardingClient({ latencyMs: 0 });
        const invite = await client.getOnboardingInvite('raw-token');
        await client.registerCounsellor('raw-token', registration([invite.topics[0].id]));

        const reopened = await client.getOnboardingInvite('raw-token');
        expect(reopened.phase).toBe('PENDING_2FA_ACTIVATION');
        expect(reopened.twoFactor?.secret).toBeTruthy();

        await client.activateTwoFactor('raw-token', '123456');
        await expect(client.getOnboardingInvite('raw-token')).rejects.toMatchObject({ reason: 'CONSUMED' });
    });

    it('rejects the deterministic invalid OTP with the typed error', async () => {
        const client = createStubCounsellorOnboardingClient({ latencyMs: 0, inviteState: 'PENDING_2FA_ACTIVATION' });

        await expect(client.activateTwoFactor('raw-token', STUB_REJECTED_OTP)).rejects.toBeInstanceOf(
            TwoFactorCodeInvalidError,
        );
    });

    it('skips the 2FA step when the stub simulates a waived gate', async () => {
        const client = createStubCounsellorOnboardingClient({ latencyMs: 0, registrationPhase: 'COMPLETED' });
        const invite = await client.getOnboardingInvite('raw-token');

        const result = await client.registerCounsellor('raw-token', registration([invite.topics[0].id]));

        expect(result.phase).toBe('COMPLETED');
        expect(result.twoFactor).toBeNull();
    });

    it.each(['CONSUMED', 'REVOKED', 'EXPIRED', 'INVALID'] as const)(
        'reports a dead link as %s on resolve',
        async (reason) => {
            const client = createStubCounsellorOnboardingClient({ latencyMs: 0, inviteState: reason });

            await expect(client.getOnboardingInvite('raw-token')).rejects.toMatchObject({ reason });
        },
    );
});

describe('createHttpCounsellorOnboardingClient', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('resolves the invite unauthenticated on the shared public onboarding endpoint', async () => {
        mocks.fetchData.mockResolvedValue({
            targetRole: 'COUNSELLOR',
            recipientEmail: 'lena@example.org',
            topics: [{ id: 12, name: 'Familienberatung' }],
        });
        const client = createHttpCounsellorOnboardingClient();

        const invite = await client.getOnboardingInvite('raw token');

        expect(invite.topics).toEqual([{ id: 12, name: 'Familienberatung' }]);
        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/raw%20token/onboarding`,
                method: FETCH_METHODS.GET,
                skipAuth: true,
            }),
        );
    });

    it('defaults a missing topics array to empty instead of crashing the wizard', async () => {
        mocks.fetchData.mockResolvedValue({ recipientEmail: 'lena@example.org' });
        const client = createHttpCounsellorOnboardingClient();

        const invite = await client.getOnboardingInvite('tok');

        expect(invite.topics).toEqual([]);
    });

    it('maps the machine-readable reason body of a 410 before the status fallback', async () => {
        mocks.fetchData.mockRejectedValue(new Response(JSON.stringify({ reason: 'REVOKED' }), { status: 410 }));
        const client = createHttpCounsellorOnboardingClient();

        await expect(client.getOnboardingInvite('tok')).rejects.toMatchObject({ reason: 'REVOKED' });
    });

    it('maps a bare 404 to INVALID', async () => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status: 404 }));
        const client = createHttpCounsellorOnboardingClient();

        await expect(client.getOnboardingInvite('tok')).rejects.toBeInstanceOf(InviteLinkError);
        mocks.fetchData.mockRejectedValue(new Response(null, { status: 404 }));
        await expect(client.getOnboardingInvite('tok')).rejects.toMatchObject({ reason: 'INVALID' });
    });

    it('posts the registration payload to the register endpoint', async () => {
        mocks.fetchData.mockResolvedValue({
            consultantId: 'c-1',
            phase: 'PENDING_2FA_ACTIVATION',
            twoFactor: { secret: 'S', qrCodeBase64: null },
        });
        const client = createHttpCounsellorOnboardingClient();

        const result = await client.registerCounsellor('tok', registration([12]));

        expect(result.consultantId).toBe('c-1');
        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/tok/onboarding/register`,
                method: FETCH_METHODS.POST,
                skipAuth: true,
                bodyData: JSON.stringify(registration([12])),
            }),
        );
    });

    it('maps a rejected one-time password (400) to the typed invalid-code error', async () => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status: 400 }));
        const client = createHttpCounsellorOnboardingClient();

        await expect(client.activateTwoFactor('tok', '000000')).rejects.toBeInstanceOf(TwoFactorCodeInvalidError);
    });

    it('keeps link-death mapping on the two-factor endpoint', async () => {
        mocks.fetchData.mockRejectedValue(new Response(JSON.stringify({ reason: 'CONSUMED' }), { status: 410 }));
        const client = createHttpCounsellorOnboardingClient();

        await expect(client.activateTwoFactor('tok', '123456')).rejects.toMatchObject({ reason: 'CONSUMED' });
    });
});
