import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
    InviteLinkError,
    TenantAdminOnboardingClient,
    TenantAdminOnboardingInviteDTO,
} from '../../api/tenantOnboarding/tenantOnboarding';
import { DpaForwardClient } from '../../api/tenantOnboarding/dpaForward';
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

const renderFlow = (client: TenantAdminOnboardingClient, token = 'raw-token', forwardClient?: DpaForwardClient) =>
    render(
        <MemoryRouter>
            <TenantAdminOnboarding inviteToken={token} client={client} forwardClient={forwardClient} />
        </MemoryRouter>,
    );

const FORWARD_LINK = { signUrl: 'https://app.example.org/dpa-sign/fwd-token', expiresAt: '2026-08-29T14:31:07' };

/**
 * Stand-in at the {@link DpaForwardClient} seam. `mailNotSent` models the
 * backend answering 200 with the link plus `mailSent: false` — issued, but not
 * delivered. The wire-level `mailSent` → `mailFailed` mapping is covered in
 * dpaForward.test.ts; what matters here is the outcome the wizard receives.
 */
const createForwardClient = (mailNotSent = false): DpaForwardClient => ({
    forward: vi.fn().mockImplementation(async (_token: string, request: { recipientEmail?: string } = {}) => ({
        link: FORWARD_LINK,
        mailFailed: mailNotSent && !!request.recipientEmail,
    })),
});

const completeOrganisationStep = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByLabelText('tenantOnboarding.organisation.name');
    await user.type(screen.getByLabelText('tenantOnboarding.organisation.name'), 'Beispiel e.V.');
    await user.type(screen.getByLabelText('tenantOnboarding.organisation.subdomain'), 'beispiel');
    await user.type(screen.getByLabelText('tenantOnboarding.organisation.address'), 'Musterstraße 1');
    await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
    await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerNote'), 'Beispiel e.V.');
    await user.click(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' }));
    await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));
};

describe('TenantAdminOnboarding', () => {
    it('renders the published DPA text and walks organisation → account → 2FA → done', async () => {
        const client = createClient();
        const user = userEvent.setup();
        renderFlow(client);

        // Step 1: organisation + existing DPA text (rendered, not authored here).
        // The reader wrapper mounts with title/description first; TipTap then
        // applies the published HTML — wait for the body, not just the shell.
        await waitFor(() => expect(screen.getByTestId('dpa-text')).toHaveTextContent('AVV-Text des Betreibers'));
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

        // Step 3: 2FA. The screen must show the base32 form of the stored
        // secret — the raw value would produce codes Keycloak rejects.
        // The shared helper intentionally emits unpadded Base32.
        const shown = await screen.findByTestId('totp-secret');
        expect(shown.textContent).toBe('KNCUGUSFKQZDGNBVGY3UCQSDIRCUMRY');
        await user.type(screen.getByLabelText('twoFactorSetup.otp.label'), '123456');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

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
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerNote'), 'Beispiel e.V.');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('tenantOnboarding.dpa.acceptRequired');
        expect(screen.queryByLabelText('tenantOnboarding.account.password')).not.toBeInTheDocument();
    });

    it.each([
        ['CONSUMED', 'link-error-consumed'],
        ['REVOKED', 'link-error-revoked'],
        ['EXPIRED', 'link-error-expired'],
        ['SUPERSEDED', 'link-error-superseded'],
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

    /**
     * The owner's tab held an invite link that a resend had replaced in the
     * meantime (2026-08-31). The register was rejected server-side with 410
     * SUPERSEDED — and the UI answered with the generic "something is
     * missing above" validation banner, with nothing marked. A superseded
     * link is a terminal link state, not a form problem: it must land on the
     * dedicated terminal page that points at the newest e-mail, with no
     * field-validation framing anywhere.
     */
    it('lands a mid-flow SUPERSEDED rejection on its terminal page, never on field-validation framing', async () => {
        const client = createClient({
            registerTenantAdmin: vi.fn().mockRejectedValue(new InviteLinkError('SUPERSEDED')),
        });
        const user = userEvent.setup();
        renderFlow(client);

        await completeOrganisationStep(user);
        await user.type(await screen.findByLabelText('tenantOnboarding.account.password'), 'SecurePass1!');
        await user.type(screen.getByLabelText('tenantOnboarding.account.repeatPassword'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.account.register' }));

        expect(await screen.findByTestId('link-error-superseded')).toBeInTheDocument();
        // The remedy is named — the newest mail holds the working link.
        expect(screen.getByText('tenantOnboarding.linkError.superseded.description')).toBeInTheDocument();
        // Terminal: nothing to resubmit, and no validation language in sight.
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByText('tenantOnboarding.validation.incomplete')).not.toBeInTheDocument();
        expect(screen.queryByText('tenantOnboarding.account.registrationError')).not.toBeInTheDocument();
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

/**
 * #594.6 — a submit that does nothing leaves the user stranded. Whatever is
 * missing, the reason appears AT the button that was just pressed, and the
 * flow points at what has to be fixed.
 */
describe('TenantAdminOnboarding — incomplete submit is answered at the action', () => {
    const fillEverythingBut = async (user: ReturnType<typeof userEvent.setup>, skip: 'address' | 'nothing') => {
        await screen.findByLabelText('tenantOnboarding.organisation.name');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.name'), 'Beispiel e.V.');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.subdomain'), 'beispiel');
        if (skip !== 'address') {
            await user.type(screen.getByLabelText('tenantOnboarding.organisation.address'), 'Musterstraße 1');
        }
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerPosition'), 'Geschäftsführung');
        await user.type(screen.getByLabelText('tenantOnboarding.dpa.signerNote'), 'Beispiel e.V.');
    };

    it('reports a missing field next to the submit button, not only far above it', async () => {
        const user = userEvent.setup();
        renderFlow(createClient());

        await fillEverythingBut(user, 'address');
        await user.click(screen.getByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' }));
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));

        const summary = await screen.findByTestId('onboarding-submit-error');
        expect(summary).toHaveTextContent('tenantOnboarding.validation.incomplete');
        // Announced, not just visible — a silent div leaves SR users stranded.
        expect(summary).toHaveAttribute('role', 'alert');
        // ... and it sits between the form and the button the user just pressed.
        const button = screen.getByRole('button', { name: 'tenantOnboarding.continue' });
        // eslint-disable-next-line no-bitwise
        expect(summary.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // The offending field keeps its own inline message as well.
        expect(screen.getAllByText('tenantOnboarding.validation.required').length).toBeGreaterThan(0);
    });

    it('names the missing consent at the button and marks the consent block', async () => {
        const user = userEvent.setup();
        renderFlow(createClient());

        await fillEverythingBut(user, 'nothing');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));

        const summary = await screen.findByTestId('onboarding-submit-error');
        expect(summary).toHaveTextContent('tenantOnboarding.dpa.acceptRequired');
        expect(screen.getByTestId('dpa-consent-error')).toBeInTheDocument();
    });

    it('clears the summary as soon as the user starts fixing the form', async () => {
        const user = userEvent.setup();
        renderFlow(createClient());

        await fillEverythingBut(user, 'address');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));
        expect(await screen.findByTestId('onboarding-submit-error')).toBeInTheDocument();

        await user.type(screen.getByLabelText('tenantOnboarding.organisation.address'), 'Musterstraße 1');

        await waitFor(() => expect(screen.queryByTestId('onboarding-submit-error')).not.toBeInTheDocument());
    });
});

/**
 * #596 review — the acceptance the backend stores must be an acceptance of a
 * text this user actually saw. When the published agreement is empty (no
 * content for any language, or a sanitiser that strips everything), the step
 * previously only warned and still let the user tick the box and submit
 * `accepted: true`. ORISO-UserService#914 was the mirror image of this bug on
 * the server side; it does not come back through the UI.
 */
describe('TenantAdminOnboarding — an unavailable DPA cannot be accepted', () => {
    const inviteWithoutDpa = { ...INVITE, dpaContent: null };

    const fillOrganisation = async (user: ReturnType<typeof userEvent.setup>) => {
        await screen.findByLabelText('tenantOnboarding.organisation.name');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.name'), 'Beispiel e.V.');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.subdomain'), 'beispiel');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.address'), 'Musterstraße 1');
    };

    it('offers no consent control and explains why', async () => {
        renderFlow(createClient({ getOnboardingInvite: vi.fn().mockResolvedValue(inviteWithoutDpa) }));

        expect(await screen.findByTestId('dpa-content-unavailable')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dpa-consent')).not.toBeInTheDocument();
    });

    it('refuses to continue and names the reason at the button', async () => {
        const user = userEvent.setup();
        const client = createClient({ getOnboardingInvite: vi.fn().mockResolvedValue(inviteWithoutDpa) });
        renderFlow(client);

        await fillOrganisation(user);
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));

        const summary = await screen.findByTestId('onboarding-submit-error');
        expect(summary).toHaveAttribute('role', 'alert');
        expect(summary).toHaveTextContent('tenantOnboarding.dpa.unavailableBlocked');
        // Still on step 1 — the account step never opens.
        expect(screen.queryByLabelText('tenantOnboarding.account.password')).not.toBeInTheDocument();
        expect(client.registerTenantAdmin).not.toHaveBeenCalled();
    });

    it('forward path (#723): dialog → calm on-hold → continue without consent → done mentions the signature mail', async () => {
        const client = createClient();
        const forwardClient = createForwardClient();
        const user = userEvent.setup();
        renderFlow(client, 'raw-token', forwardClient);

        // Fill only the organisation data — no signer fields, no consent.
        await screen.findByLabelText('tenantOnboarding.organisation.name');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.name'), 'Beispiel e.V.');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.subdomain'), 'beispiel');
        await user.type(screen.getByLabelText('tenantOnboarding.organisation.address'), 'Musterstraße 1');

        // The second path is available without completing the signature form.
        await user.click(screen.getByRole('button', { name: /dpaForward.action.notAuthorised/ }));
        expect(await screen.findByTestId('dpa-forward-dialog')).toBeInTheDocument();
        // Opening mints nothing: only five sign links may be outstanding per
        // onboarding, so a link costs an explicit act (#712).
        expect(forwardClient.forward).not.toHaveBeenCalled();
        expect(screen.queryByLabelText('dpaForward.dialog.linkLabel')).not.toBeInTheDocument();

        // Asking for the shareable link mints exactly one, and with no
        // recipient — so no mail goes out on this path.
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.linkCreate' }));
        expect(forwardClient.forward).toHaveBeenCalledTimes(1);
        expect(forwardClient.forward).toHaveBeenCalledWith('raw-token', {});
        await waitFor(() =>
            expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(FORWARD_LINK.signUrl),
        );

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));

        // The step flips to the calm on-hold state: notice, no consent box.
        expect(await screen.findByTestId('dpa-forwarded-notice')).toBeInTheDocument();
        expect(screen.getByTestId('dpa-forwarded-onhold')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: 'tenantOnboarding.dpa.accept' })).not.toBeInTheDocument();

        // Continue to account + 2FA without a signature.
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.continue' }));
        await user.type(await screen.findByLabelText('tenantOnboarding.account.password'), 'SecurePass1!');
        await user.type(screen.getByLabelText('tenantOnboarding.account.repeatPassword'), 'SecurePass1!');
        await user.click(screen.getByRole('button', { name: 'tenantOnboarding.account.register' }));

        await waitFor(() =>
            expect(client.registerTenantAdmin).toHaveBeenCalledWith(
                'raw-token',
                expect.objectContaining({ dpa: expect.objectContaining({ accepted: false }) }),
            ),
        );

        await user.type(await screen.findByLabelText('twoFactorSetup.otp.label'), '123456');
        await user.click(screen.getByRole('button', { name: 'twoFactorSetup.submit' }));

        expect(await screen.findByTestId('onboarding-done')).toBeInTheDocument();
        // Completion messaging mentions the notification mail on signature.
        expect(screen.getByText('tenantOnboarding.done.next.signature')).toBeInTheDocument();
    });

    it('sends the forward mail from the dialog and shows the recipient in the on-hold state', async () => {
        const client = createClient();
        const forwardClient = createForwardClient();
        const user = userEvent.setup();
        renderFlow(client, 'raw-token', forwardClient);

        await screen.findByLabelText('tenantOnboarding.organisation.name');
        await user.click(screen.getByRole('button', { name: /dpaForward.action.notAuthorised/ }));
        await screen.findByTestId('dpa-forward-dialog');

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientName'), 'Dr. Ruth Recht');
        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));
        await screen.findByTestId('dpa-forward-sent');
        // The send IS the minting act: one forward costs one link, with no
        // warm-up call on open (#712).
        expect(forwardClient.forward).toHaveBeenCalledTimes(1);
        // The typed name travels with the send (#842).
        expect(forwardClient.forward).toHaveBeenLastCalledWith('raw-token', {
            recipientEmail: 'legal@example.org',
            recipientName: 'Dr. Ruth Recht',
        });
        // …and the link that send issued is the one on offer to copy.
        await waitFor(() =>
            expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(FORWARD_LINK.signUrl),
        );

        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));
        expect(await screen.findByTestId('dpa-forwarded-sent-to')).toBeInTheDocument();
    });

    /**
     * Was "502 forward (link created, mail not sent)". That path is gone
     * (dd0e7519): a failed delivery is no longer an error status but a 200
     * carrying the link plus `mailSent: false`, because the old 502 fallback
     * fetched a link with a SECOND call and so cost two of the five allowed
     * outstanding links. The scenario is therefore renamed, not dropped — the
     * behaviour it protects is unchanged and still reachable: a mail that did
     * not go out leaves the wizard usable, with the copyable link and an honest
     * note instead of a claimed delivery.
     */
    it('mail not sent (200 with mailSent: false) still lets the wizard continue, with an honest note', async () => {
        const client = createClient();
        const forwardClient = createForwardClient(true);
        const user = userEvent.setup();
        renderFlow(client, 'raw-token', forwardClient);

        await screen.findByLabelText('tenantOnboarding.organisation.name');
        await user.click(screen.getByRole('button', { name: /dpaForward.action.notAuthorised/ }));
        await screen.findByTestId('dpa-forward-dialog');

        await user.type(screen.getByLabelText('dpaForward.dialog.recipientEmail'), 'legal@example.org');
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.send' }));

        // Warning, not error — the link exists and is the fallback.
        await screen.findByTestId('dpa-forward-mail-failed');
        // A failed delivery costs ONE link, not two: nothing re-fetches one.
        expect(forwardClient.forward).toHaveBeenCalledTimes(1);
        expect(screen.getByLabelText('dpaForward.dialog.linkLabel')).toHaveValue(FORWARD_LINK.signUrl);
        await user.click(screen.getByRole('button', { name: 'dpaForward.dialog.confirm' }));

        expect(await screen.findByTestId('dpa-forwarded-onhold')).toBeInTheDocument();
        expect(screen.getByTestId('dpa-forwarded-mail-failed')).toBeInTheDocument();
        expect(screen.queryByTestId('dpa-forwarded-sent-to')).not.toBeInTheDocument();
    });
});
