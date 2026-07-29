import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
    InviteLinkError,
    TenantAdminOnboardingClient,
    TenantAdminOnboardingInviteDTO,
} from '../../api/tenantOnboarding/tenantOnboarding';
import { TenantAdminOnboarding } from './TenantAdminOnboarding';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../../api/fetchData', async () => {
    const actual = await vi.importActual<typeof import('../../api/fetchData')>('../../api/fetchData');

    return {
        ...actual,
        fetchData: mocks.fetchData,
    };
});

const INVITE: TenantAdminOnboardingInviteDTO = {
    recipientEmail: 'admin@tenant.example',
    firstName: 'Erika',
    lastName: 'Beispiel',
    reservedTenantId: 21,
    tenantIdReservationToken: 'reservation-token-21',
    expiresAt: null,
    dpaContent: JSON.stringify({ de: '<p>AVV-Text des Betreibers</p>' }),
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

const renderFlow = (client: TenantAdminOnboardingClient, token = 'raw-token') =>
    render(
        <MemoryRouter>
            <TenantAdminOnboarding inviteToken={token} client={client} />
        </MemoryRouter>,
    );

const completeOrganisationStep = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByLabelText('tenantOnboarding.organisation.name');
    await user.type(screen.getByLabelText('tenantOnboarding.organisation.name'), 'Beispiel e.V.');
    await user.type(screen.getByLabelText('tenantOnboarding.organisation.subdomain'), 'beispiel');
    await user.type(screen.getByLabelText('tenantOnboarding.organisation.address'), 'Musterstraße 1');
    await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
    await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerOrganisation'), 'Beispiel e.V.');
    await user.click(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' }));
    await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));
};

describe('TenantAdminOnboarding', () => {
    it('renders the published DPA text and walks organisation → account → 2FA → done', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        // Step 1: organisation + existing DPA text (rendered, not authored here).
        expect(await screen.findByTestId('dpa-text')).toHaveTextContent('AVV-Text des Betreibers');
        // Signer fields are prefilled from the invite.
        expect(screen.getByLabelText('tenantOnboarding.dpa.signerName')).toHaveValue('Erika Beispiel');
        expect(screen.getByLabelText('tenantOnboarding.dpa.signerEmail')).toHaveValue('admin@tenant.example');

        await completeOrganisationStep(user);

        // Step 2: account creation for the invited address.
        expect(await screen.findByText('admin@tenant.example')).toBeInTheDocument();
        await user.type(screen.getByLabelText('tenantOnboarding.account.password'), 'SecurePass1!');
        await user.type(screen.getByLabelText('tenantOnboarding.account.repeatPassword'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.account.register' }));

        // Registration echoes the reservation pair (atomic consumption contract).
        await waitFor(() =>
            expect(client.registerTenantAdmin).toHaveBeenCalledWith(
                'raw-token',
                expect.objectContaining({
                    reservedTenantId: 21,
                    tenantIdReservationToken: 'reservation-token-21',
                    organisation: { name: 'Beispiel e.V.', subdomain: 'beispiel', address: 'Musterstraße 1' },
                    dpa: expect.objectContaining({ accepted: true, signerName: 'Erika Beispiel' }),
                }),
            ),
        );

        // Step 3: 2FA.
        expect(await screen.findByTestId('totp-secret')).toHaveTextContent('SECRET234567ABCDEFG');
        await user.type(screen.getByLabelText('tenantOnboarding.twoFactor.codeLabel'), '123456');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.twoFactor.activate' }));

        expect(await screen.findByTestId('onboarding-done')).toBeInTheDocument();
        expect(client.activateTwoFactor).toHaveBeenCalledWith('raw-token', '123456');
    });

    it('blocks step 1 until the DPA is confirmed', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        await screen.findByLabelText('tenantOnboarding.organisation.name');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.name'), 'Beispiel e.V.');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.subdomain'), 'beispiel');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.address'), 'Musterstraße 1');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerOrganisation'), 'Beispiel e.V.');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('tenantOnboarding.dpa.acceptRequired');
        expect(screen.queryByLabelText('tenantOnboarding.account.password')).not.toBeInTheDocument();
    });

    it.each([
        ['CONSUMED', 'link-error-consumed'],
        ['REVOKED', 'link-error-revoked'],
        ['EXPIRED', 'link-error-expired'],
        ['INVALID', 'link-error-invalid'],
    ] as const)('shows the distinct %s error state without any form', async (reason, testId) => {
        const client = createClient({
            getOnboardingInvite: vi.fn().mockRejectedValue(new InviteLinkError(reason)),
        });
        renderFlow(client);

        expect(await screen.findByTestId(testId)).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('drops into the CONSUMED error state when the registration loses the race — nothing can be resubmitted', async () => {
        const client = createClient({
            registerTenantAdmin: vi.fn().mockRejectedValue(new InviteLinkError('CONSUMED')),
        });
        const user = userEvent.setup();
        renderFlow(client);

        await completeOrganisationStep(user);
        await user.type(await screen.findByLabelText('tenantOnboarding.account.password'), 'SecurePass1!');
        await user.type(screen.getByLabelText('tenantOnboarding.account.repeatPassword'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.account.register' }));

        expect(await screen.findByTestId('link-error-consumed')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(client.registerTenantAdmin).toHaveBeenCalledTimes(1);
    });

    it('treats a missing token as an invalid link', async () => {
        const client = createClient();
        renderFlow(client, '');

        expect(await screen.findByTestId('link-error-invalid')).toBeInTheDocument();
        expect(client.getOnboardingInvite).not.toHaveBeenCalled();
    });

    it('talks to the real public onboarding API by default — never a stub in production', async () => {
        mocks.fetchData.mockRejectedValue(new Response(null, { status: 404 }));

        render(
            <MemoryRouter>
                <TenantAdminOnboarding inviteToken="raw-token" />
            </MemoryRouter>,
        );

        // An unknown token gets an honest terminal error from the backend —
        // not a fake happy path with hardcoded demo data.
        expect(await screen.findByTestId('link-error-invalid')).toBeInTheDocument();
        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: expect.stringContaining('/service/users/account-invites/raw-token/onboarding'),
                skipAuth: true,
            }),
        );
    });
});
