import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_METHODS } from '../fetchData';
import { publicAccountInvitesEndpoint } from '../../appConfig';
import {
    createHttpTenantAdminOnboardingClient,
    createStubTenantAdminOnboardingClient,
    InviteLinkError,
    STUB_REJECTED_OTP,
    TenantAdminOnboardingInviteDTO,
    TenantAdminRegistrationRequest,
    TwoFactorCodeInvalidError,
} from './tenantOnboarding';

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

const registrationFor = (
    invite: Awaited<ReturnType<ReturnType<typeof createStubTenantAdminOnboardingClient>['getOnboardingInvite']>>,
): TenantAdminRegistrationRequest => ({
    organisation: { name: 'Beispiel e.V.', subdomain: 'beispiel', address: 'Musterstraße 1' },
    dpa: {
        accepted: true,
        signerName: 'Erika Beispiel',
        signerPosition: 'Geschäftsführung',
        signerEmail: invite.recipientEmail,
        signerOrganisation: 'Beispiel e.V.',
    },
    account: { password: 'SecurePass1!' },
    reservedTenantId: invite.reservedTenantId,
    tenantIdReservationToken: invite.tenantIdReservationToken,
});

describe('createStubTenantAdminOnboardingClient', () => {
    it('registers once with the echoed reservation pair and returns the reserved tenant id', async () => {
        const client = createStubTenantAdminOnboardingClient({ latencyMs: 0 });
        const invite = await client.getOnboardingInvite('raw-token');

        const result = await client.registerTenantAdmin('raw-token', registrationFor(invite));

        expect(result.tenantId).toBe(invite.reservedTenantId);
        expect(result.twoFactor.secret).toBeTruthy();
    });

    it('consumes the link atomically: the second registration fails with CONSUMED', async () => {
        const client = createStubTenantAdminOnboardingClient({ latencyMs: 0 });
        const invite = await client.getOnboardingInvite('raw-token');
        await client.registerTenantAdmin('raw-token', registrationFor(invite));

        await expect(client.registerTenantAdmin('raw-token', registrationFor(invite))).rejects.toMatchObject({
            reason: 'CONSUMED',
        });
        await expect(client.getOnboardingInvite('raw-token')).rejects.toBeInstanceOf(InviteLinkError);
    });

    it('rejects a registration whose reservation token does not match (TenantService conflict semantics)', async () => {
        const client = createStubTenantAdminOnboardingClient({ latencyMs: 0 });
        const invite = await client.getOnboardingInvite('raw-token');

        await expect(
            client.registerTenantAdmin('raw-token', {
                ...registrationFor(invite),
                tenantIdReservationToken: 'some-other-token',
            }),
        ).rejects.toBeInstanceOf(InviteLinkError);
        // The failed attempt must NOT consume the link.
        await expect(client.getOnboardingInvite('raw-token')).resolves.toBeTruthy();
    });

    it.each(['CONSUMED', 'REVOKED', 'EXPIRED', 'INVALID'] as const)('surfaces a %s link on lookup', async (reason) => {
        const client = createStubTenantAdminOnboardingClient({ latencyMs: 0, inviteState: reason });
        await expect(client.getOnboardingInvite('raw-token')).rejects.toMatchObject({ reason });
    });

    it('rejects the demo OTP and malformed codes, accepts a normal 6-digit code', async () => {
        const client = createStubTenantAdminOnboardingClient({ latencyMs: 0 });
        await expect(client.activateTwoFactor('raw-token', STUB_REJECTED_OTP)).rejects.toBeInstanceOf(
            TwoFactorCodeInvalidError,
        );
        await expect(client.activateTwoFactor('raw-token', '12345')).rejects.toBeInstanceOf(TwoFactorCodeInvalidError);
        await expect(client.activateTwoFactor('raw-token', '123456')).resolves.toBeUndefined();
    });
});

describe('createHttpTenantAdminOnboardingClient', () => {
    const INVITE: TenantAdminOnboardingInviteDTO = {
        recipientEmail: 'admin@tenant.example',
        firstName: 'Erika',
        lastName: 'Beispiel',
        reservedTenantId: 21,
        tenantIdReservationToken: 'reservation-token-21',
        expiresAt: null,
        dpaContent: null,
    };

    const REGISTRATION: TenantAdminRegistrationRequest = {
        organisation: { name: 'Beispiel e.V.', subdomain: 'beispiel', address: 'Musterstraße 1' },
        dpa: {
            accepted: true,
            signerName: 'Erika Beispiel',
            signerPosition: 'Geschäftsführung',
            signerEmail: 'admin@tenant.example',
            signerOrganisation: 'Beispiel e.V.',
        },
        account: { password: 'SecurePass1!' },
        reservedTenantId: 21,
        tenantIdReservationToken: 'reservation-token-21',
    };

    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('resolves the invite from the public onboarding endpoint without auth', async () => {
        mocks.fetchData.mockResolvedValueOnce(INVITE);
        const client = createHttpTenantAdminOnboardingClient();

        await expect(client.getOnboardingInvite('raw/token')).resolves.toEqual(INVITE);

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/raw%2Ftoken/onboarding`,
                method: FETCH_METHODS.GET,
                skipAuth: true,
            }),
        );
    });

    it.each([
        [404, 'INVALID'],
        [409, 'CONSUMED'],
        [410, 'EXPIRED'],
        [423, 'REVOKED'],
    ] as const)('maps HTTP %s to the %s link error', async (status, reason) => {
        mocks.fetchData.mockRejectedValueOnce(new Response(null, { status }));
        const client = createHttpTenantAdminOnboardingClient();

        const error = await client.getOnboardingInvite('raw-token').then(
            () => null,
            (caught: unknown) => caught,
        );

        expect(error).toBeInstanceOf(InviteLinkError);
        expect((error as InviteLinkError).reason).toBe(reason);
    });

    it('prefers the reason from the response body over the status mapping', async () => {
        mocks.fetchData.mockRejectedValueOnce(
            new Response(JSON.stringify({ reason: 'REVOKED' }), {
                status: 410,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        const client = createHttpTenantAdminOnboardingClient();

        await expect(client.getOnboardingInvite('raw-token')).rejects.toMatchObject({ reason: 'REVOKED' });
    });

    it('registers via POST …/register with the echoed reservation pair and parses the result', async () => {
        const result = { tenantId: 21, twoFactor: { secret: 'SECRET234567ABCDEFG', qrCodeBase64: null } };
        mocks.fetchData.mockResolvedValueOnce(result);
        const client = createHttpTenantAdminOnboardingClient();

        await expect(client.registerTenantAdmin('raw-token', REGISTRATION)).resolves.toEqual(result);

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/raw-token/onboarding/register`,
                method: FETCH_METHODS.POST,
                skipAuth: true,
            }),
        );
        expect(JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData)).toEqual(REGISTRATION);
    });

    it('surfaces a non-link registration failure as a retryable generic error, never a fake success', async () => {
        mocks.fetchData.mockRejectedValueOnce(new Response(null, { status: 500 }));
        const client = createHttpTenantAdminOnboardingClient();

        const error = await client.registerTenantAdmin('raw-token', REGISTRATION).then(
            () => null,
            (caught: unknown) => caught,
        );

        expect(error).not.toBeNull();
        expect(error).not.toBeInstanceOf(InviteLinkError);
        expect(error).not.toBeInstanceOf(TwoFactorCodeInvalidError);
    });

    it('activates 2FA via POST …/two-factor with the entered code', async () => {
        mocks.fetchData.mockResolvedValueOnce(new Response(null, { status: 204 }));
        const client = createHttpTenantAdminOnboardingClient();

        await expect(client.activateTwoFactor('raw-token', '123456')).resolves.toBeUndefined();

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${publicAccountInvitesEndpoint}/raw-token/onboarding/two-factor`,
                method: FETCH_METHODS.POST,
                skipAuth: true,
            }),
        );
        expect(JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData)).toEqual({ otp: '123456' });
    });

    it.each([[400], [422]] as const)('maps HTTP %s on 2FA activation to an invalid code', async (status) => {
        mocks.fetchData.mockRejectedValueOnce(new Response(null, { status }));
        const client = createHttpTenantAdminOnboardingClient();

        await expect(client.activateTwoFactor('raw-token', '000000')).rejects.toBeInstanceOf(TwoFactorCodeInvalidError);
    });

    it('maps a link death during 2FA activation to the terminal link error', async () => {
        mocks.fetchData.mockRejectedValueOnce(new Response(null, { status: 409 }));
        const client = createHttpTenantAdminOnboardingClient();

        await expect(client.activateTwoFactor('raw-token', '123456')).rejects.toMatchObject({ reason: 'CONSUMED' });
    });
});
