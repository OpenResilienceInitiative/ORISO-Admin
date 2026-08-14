import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
    InviteLinkError,
    TenantAdminOnboardingClient,
    TenantAdminOnboardingInviteDTO,
    TwoFactorCodeInvalidError,
} from '../../api/tenantOnboarding/tenantOnboarding';
import { useTenantAdminOnboardingFlow } from './useTenantAdminOnboardingFlow';

const INVITE: TenantAdminOnboardingInviteDTO = {
    recipientEmail: 'admin@tenant.example',
    firstName: 'Erika',
    lastName: 'Beispiel',
    reservedTenantId: 21,
    tenantIdReservationToken: 'reservation-token-21',
    expiresAt: null,
    dpaContent: JSON.stringify({ de: '<p>AVV</p>' }),
};

const ORGANISATION = { name: 'Beispiel e.V.', subdomain: 'beispiel', address: 'Musterstraße 1, 12345 Musterstadt' };
const DPA = {
    accepted: true,
    signerName: 'Erika Beispiel',
    signerPosition: 'Geschäftsführung',
    signerEmail: 'admin@tenant.example',
    signerOrganisation: 'Beispiel e.V.',
};

const createClient = (overrides: Partial<TenantAdminOnboardingClient> = {}): TenantAdminOnboardingClient => ({
    getOnboardingInvite: vi.fn().mockResolvedValue(INVITE),
    registerTenantAdmin: vi.fn().mockResolvedValue({
        tenantId: 21,
        twoFactor: { secret: 'SECRET234567ABCDEFG', qrCodeBase64: null },
    }),
    activateTwoFactor: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});

describe('useTenantAdminOnboardingFlow', () => {
    it('walks the happy path: loading → organisation → account → two-factor → done', async () => {
        const client = createClient();
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));

        expect(result.current.state.phase).toBe('loading');
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));
        expect(result.current.invite?.reservedTenantId).toBe(21);

        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        expect(result.current.state.phase).toBe('account');

        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });
        expect(result.current.state.phase).toBe('two-factor');
        expect(client.registerTenantAdmin).toHaveBeenCalledWith('raw-token', {
            organisation: ORGANISATION,
            dpa: DPA,
            account: { password: 'SecurePass1!' },
            reservedTenantId: 21,
            tenantIdReservationToken: 'reservation-token-21',
        });

        await act(async () => {
            await result.current.submitTwoFactorCode('123456');
        });
        expect(result.current.state.phase).toBe('done');
        expect(client.activateTwoFactor).toHaveBeenCalledWith('raw-token', '123456');
    });

    it.each(['CONSUMED', 'REVOKED', 'EXPIRED', 'INVALID'] as const)(
        'maps a %s link to a distinct link-error state on load',
        async (reason) => {
            const client = createClient({
                getOnboardingInvite: vi.fn().mockRejectedValue(new InviteLinkError(reason)),
            });
            const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));

            await waitFor(() => expect(result.current.state.phase).toBe('link-error'));
            expect(result.current.state.phase === 'link-error' && result.current.state.reason).toBe(reason);
        },
    );

    it('treats a missing token as an INVALID link without calling the backend', async () => {
        const client = createClient();
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('', client));

        await waitFor(() => expect(result.current.state.phase).toBe('link-error'));
        expect(result.current.state.phase === 'link-error' && result.current.state.reason).toBe('INVALID');
        expect(client.getOnboardingInvite).not.toHaveBeenCalled();
    });

    it('keeps entered organisation data when navigating back from the account step', async () => {
        const client = createClient();
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));

        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        act(() => result.current.goBackToOrganisation());

        expect(result.current.state.phase).toBe('organisation');
        expect(result.current.organisation).toEqual(ORGANISATION);
        expect(result.current.dpa).toEqual(DPA);
    });

    it('moves to the CONSUMED link-error state when the registration loses the race, and blocks resubmits', async () => {
        const client = createClient({
            registerTenantAdmin: vi.fn().mockRejectedValue(new InviteLinkError('CONSUMED')),
        });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));

        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });

        expect(result.current.state.phase).toBe('link-error');
        expect(result.current.state.phase === 'link-error' && result.current.state.reason).toBe('CONSUMED');

        // The flow is terminal now: further submits must not reach the client again.
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });
        expect(client.registerTenantAdmin).toHaveBeenCalledTimes(1);
    });

    it('shows a retryable submit error when the registration fails technically', async () => {
        const client = createClient({
            registerTenantAdmin: vi
                .fn()
                .mockRejectedValueOnce(new Error('CATCH_ALL'))
                .mockResolvedValueOnce({ tenantId: 21, twoFactor: { secret: 'S', qrCodeBase64: null } }),
        });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));

        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });

        expect(result.current.state.phase).toBe('account');
        expect(result.current.submitError).toBe('registration');

        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });
        expect(result.current.state.phase).toBe('two-factor');
        expect(result.current.submitError).toBeNull();
    });

    it('keeps the two-factor step retryable after an invalid code but hard-fails on a dead link', async () => {
        const client = createClient({
            activateTwoFactor: vi
                .fn()
                .mockRejectedValueOnce(new TwoFactorCodeInvalidError())
                .mockRejectedValueOnce(new InviteLinkError('REVOKED')),
        });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));
        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });

        await act(async () => {
            await result.current.submitTwoFactorCode('000000');
        });
        expect(result.current.state.phase).toBe('two-factor');
        expect(result.current.submitError).toBe('two-factor-code');

        await act(async () => {
            await result.current.submitTwoFactorCode('123456');
        });
        expect(result.current.state.phase).toBe('link-error');
        expect(result.current.state.phase === 'link-error' && result.current.state.reason).toBe('REVOKED');
    });

    it('maps a transient load failure to the retryable load-error state, and retry re-resolves', async () => {
        const getOnboardingInvite = vi
            .fn()
            .mockRejectedValueOnce(new Error('TENANT_ONBOARDING_HTTP_503'))
            .mockResolvedValueOnce(INVITE);
        const client = createClient({ getOnboardingInvite });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));

        // NOT the terminal INVALID link error — a network hiccup is retryable.
        await waitFor(() => expect(result.current.state.phase).toBe('load-error'));

        act(() => result.current.retryLoad());
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));
        expect(getOnboardingInvite).toHaveBeenCalledTimes(2);
    });

    it('ignores retryLoad outside the load-error state', async () => {
        const client = createClient();
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));

        act(() => result.current.retryLoad());

        expect(result.current.state.phase).toBe('organisation');
        expect(client.getOnboardingInvite).toHaveBeenCalledTimes(1);
    });

    it('guards against double-submits while the registration is in flight', async () => {
        let resolveRegistration!: (value: unknown) => void;
        const registerTenantAdmin = vi.fn().mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveRegistration = resolve;
                }),
        );
        const client = createClient({ registerTenantAdmin });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));
        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));

        let first!: Promise<void>;
        act(() => {
            first = result.current.submitAccount('SecurePass1!');
        });
        // Second click while the first request is still running: must be a no-op.
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });
        expect(registerTenantAdmin).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveRegistration({ tenantId: 21, twoFactor: { secret: 'S', qrCodeBase64: null } });
            await first;
        });
        expect(result.current.state.phase).toBe('two-factor');
    });

    it('guards against double-submits while the 2FA activation is in flight', async () => {
        let resolveActivation!: () => void;
        const activateTwoFactor = vi.fn().mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveActivation = resolve;
                }),
        );
        const client = createClient({ activateTwoFactor });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));
        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });

        let first!: Promise<void>;
        act(() => {
            first = result.current.submitTwoFactorCode('123456');
        });
        await act(async () => {
            await result.current.submitTwoFactorCode('123456');
        });
        expect(activateTwoFactor).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveActivation();
            await first;
        });
        expect(result.current.state.phase).toBe('done');
    });

    it('resumes a consumed-but-2FA-pending link directly at the 2FA step (#569 resume contract)', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({
                ...INVITE,
                phase: 'PENDING_2FA_ACTIVATION',
                twoFactor: { secret: 'RESUMESECRET234567', qrCodeBase64: null },
            }),
        });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));

        await waitFor(() => expect(result.current.state.phase).toBe('two-factor'));
        const { state } = result.current;
        expect(state.phase === 'two-factor' && state.result).toEqual({
            tenantId: 21,
            twoFactor: { secret: 'RESUMESECRET234567', qrCodeBase64: null },
            resumed: true,
        });

        // The resumed step completes like the normal one.
        await act(async () => {
            await result.current.submitTwoFactorCode('123456');
        });
        expect(result.current.state.phase).toBe('done');
        expect(client.registerTenantAdmin).not.toHaveBeenCalled();
    });

    it('resumes without re-issued setup material as verify-only (twoFactor null)', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockResolvedValue({ ...INVITE, phase: 'PENDING_2FA_ACTIVATION' }),
        });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));

        await waitFor(() => expect(result.current.state.phase).toBe('two-factor'));
        const { state } = result.current;
        expect(state.phase === 'two-factor' && state.result.twoFactor).toBeNull();
        expect(state.phase === 'two-factor' && state.result.resumed).toBe(true);
    });

    it('ignores organisation/account submits before the invite is loaded', async () => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockReturnValue(new Promise(() => {})),
        });
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));

        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });

        expect(result.current.state.phase).toBe('loading');
        expect(client.registerTenantAdmin).not.toHaveBeenCalled();
    });

    it('forwarded delegation (#723): continues without a consent act and registers the forwarded state', async () => {
        const client = createClient();
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));

        const forward = {
            signLink: 'https://app.example.org/dpa-sign/fwd-token',
            expiresAt: '2026-08-28T12:00:00Z',
            recipientEmail: 'legal@example.org',
        };
        act(() => result.current.markDpaForwarded(forward));
        expect(result.current.dpaForward).toEqual(forward);

        act(() => result.current.submitOrganisationDpa(ORGANISATION, null));
        expect(result.current.state.phase).toBe('account');

        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });
        expect(result.current.state.phase).toBe('two-factor');
        expect(client.registerTenantAdmin).toHaveBeenCalledWith(
            'raw-token',
            expect.objectContaining({ organisation: ORGANISATION, dpa: { forwarded: true } }),
        );
    });

    it('refuses to leave the DPA step without either a consent act or a declared forward', async () => {
        const client = createClient();
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));

        act(() => result.current.submitOrganisationDpa(ORGANISATION, null));

        expect(result.current.state.phase).toBe('organisation');
        expect(client.registerTenantAdmin).not.toHaveBeenCalled();
    });

    it('declaring the forward drops a previously entered self-signature', async () => {
        const client = createClient();
        const { result } = renderHook(() => useTenantAdminOnboardingFlow('raw-token', client));
        await waitFor(() => expect(result.current.state.phase).toBe('organisation'));

        act(() => result.current.submitOrganisationDpa(ORGANISATION, DPA));
        act(() => result.current.goBackToOrganisation());
        act(() =>
            result.current.markDpaForwarded({
                signLink: 'https://app.example.org/dpa-sign/fwd-token',
                expiresAt: null,
                recipientEmail: null,
            }),
        );

        expect(result.current.dpa).toBeNull();

        act(() => result.current.submitOrganisationDpa(ORGANISATION, null));
        await act(async () => {
            await result.current.submitAccount('SecurePass1!');
        });
        expect(client.registerTenantAdmin).toHaveBeenCalledWith(
            'raw-token',
            expect.objectContaining({ dpa: { forwarded: true } }),
        );
    });

});
