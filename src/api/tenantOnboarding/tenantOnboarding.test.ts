import { describe, expect, it } from 'vitest';
import {
    createStubTenantAdminOnboardingClient,
    InviteLinkError,
    STUB_REJECTED_OTP,
    TenantAdminRegistrationRequest,
    TwoFactorCodeInvalidError,
} from './tenantOnboarding';

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
