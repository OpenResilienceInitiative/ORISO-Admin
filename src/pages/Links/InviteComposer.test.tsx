import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import splitButtonStyles from '../../components/GlobalSearch/splitButton.module.scss';
// Imported statically, NOT with `await import(...)` inside a test: every `vi.mock`
// below is hoisted above this line, so the mocks still apply, while a dynamic
// import would bill the transform + evaluation of this tab's module graph
// (~12.5s idle, 15.4s under a 4-worker run) to whichever test happens to load it
// first. That is what timed out AccountInvitesTab.test.tsx on CI.
import { TenantInvitesTab } from './AccountInvitesTab';

// CI runners are heavily contended; the 1s default for findBy*/waitFor flakes there.
configure({ asyncUtilTimeout: 10_000 });

// antd's Dropdown (split-button menus) queries matchMedia, which jsdom does not implement.
window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
})) as typeof window.matchMedia;

const t = (key: string, fallback?: string) => fallback ?? key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

vi.mock('../../components/ListingTable', () => ({
    ListingTable: () => <div data-testid="listing-table" />,
    listingTableStyles: new Proxy({}, { get: () => undefined }),
}));

// The dialog itself has its own test file; here only the opened view (and its
// create-from source, #746) matters.
vi.mock('./EmailTemplatesDialog', () => ({
    EmailTemplatesDialog: ({
        initialView,
        initialTemplateId,
    }: {
        initialView?: string;
        initialTemplateId?: number;
    }) => (
        <div data-testid="templates-dialog">
            {initialView}
            {initialTemplateId != null ? `:${initialTemplateId}` : ''}
        </div>
    ),
}));

const mocks = vi.hoisted(() => ({
    listAccountInvites: vi.fn(),
    createAccountInvite: vi.fn(),
    resendAccountInvite: vi.fn(),
    revokeAccountInvite: vi.fn(),
    listInviteEmailTemplates: vi.fn(),
    searchTenantData: vi.fn(),
    parseUserAuthInfo: vi.fn(),
    tenantIdAllocationClient: {
        checkIdAvailability: vi.fn(),
        nextFreeId: vi.fn(),
    },
    agencyIdAllocationClient: {
        checkIdAvailability: vi.fn(),
        nextFreeId: vi.fn(),
    },
}));

vi.mock('../../api/idAllocation/idAllocation', () => ({
    tenantIdAllocationClient: mocks.tenantIdAllocationClient,
    agencyIdAllocationClient: mocks.agencyIdAllocationClient,
}));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    accountInviteAcceptBaseUrl: 'https://admin.example/account-invite',
    acceptBaseUrlForRole: () => 'https://admin.example/account-invite',
    listAccountInvites: mocks.listAccountInvites,
    createAccountInvite: mocks.createAccountInvite,
    resendAccountInvite: mocks.resendAccountInvite,
    revokeAccountInvite: mocks.revokeAccountInvite,
    listInviteEmailTemplates: mocks.listInviteEmailTemplates,
}));

vi.mock('../../api/tenant/searchTenantData', () => ({
    searchTenantData: mocks.searchTenantData,
}));

vi.mock('../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: mocks.parseUserAuthInfo,
}));

import { sendModeStorageKey } from './InviteComposer';

const TEMPLATE = {
    id: 7,
    kind: 'TENANT_INVITE',
    name: 'Standard',
    language: 'de',
    subject: 'S',
    body: 'B',
    active: true,
    createDate: '2026-07-01T00:00:00Z',
    updateDate: null,
};

const emptyInvitesPage = {
    content: [],
    totalElements: 0,
    totalPages: 1,
    page: 0,
    size: 20,
};

const renderTenantTab = () => render(<TenantInvitesTab />);

const findSendButton = (name: string) => screen.findByRole('button', { name });

describe('InviteComposer (via TenantInvitesTab)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({});
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(emptyInvitesPage);
        mocks.tenantIdAllocationClient.checkIdAvailability.mockResolvedValue({ id: 21, state: 'FREE' });
        mocks.tenantIdAllocationClient.nextFreeId.mockResolvedValue({ id: 21 });
    });

    it('keeps the send action outlined + disabled until valid, then flips to primary', async () => {
        renderTenantTab();
        const user = userEvent.setup();

        const sendButton = await findSendButton('Direkt Versenden');
        const wrapper = sendButton.closest(`.${splitButtonStyles.splitButton}`) as HTMLElement;
        // Template auto-selected and Träger-ID auto-suggested — the empty e-mail
        // alone must keep the action gated and in the outlined (non-primary) look.
        expect(await screen.findByRole('button', { name: /Standard/ })).toBeInTheDocument();
        expect(sendButton).toBeDisabled();
        // `primary` is an alias of the sheet's `filled` variant since #741.
        expect(wrapper).not.toHaveClass(splitButtonStyles.filled);

        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');

        await waitFor(() => expect(sendButton).toBeEnabled());
        expect(wrapper).toHaveClass(splitButtonStyles.filled);
    });

    // #574: "Direkt Versenden" mails the invite out, so it carries the mail glyph
    // — outlined while the action is still gated, filled once it can actually
    // fire. The paper plane it used to show said "send" without saying that an
    // e-mail leaves the building, which is the whole difference to create-only.
    it('carries the mail glyph on Direkt Versenden and fills it once the action is live (#574)', async () => {
        await renderTenantTab();
        const user = userEvent.setup();

        const sendButton = await findSendButton('Direkt Versenden');
        expect(await screen.findByRole('button', { name: /Standard/ })).toBeInTheDocument();
        expect(sendButton).toBeDisabled();
        expect(screen.getByTestId('composer-send-icon')).toHaveAttribute('data-glyph', 'mail');

        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');

        await waitFor(() => expect(sendButton).toBeEnabled());
        expect(screen.getByTestId('composer-send-icon')).toHaveAttribute('data-glyph', 'mail-filled');
    });

    // Create-only sends no mail, so it must not keep the mail glyph — it takes
    // the same file glyph its own menu entry already carries.
    it('swaps the glyph to file-save in create-only mode (#574)', async () => {
        window.localStorage.setItem(sendModeStorageKey('TENANT_ADMIN'), 'createOnly');

        await renderTenantTab();

        await findSendButton('Empfänger nur anlegen');
        expect(screen.getByTestId('composer-send-icon')).toHaveAttribute('data-glyph', 'file-save');
    });

    it('marks the Direkt Versenden menu entry with the same mail glyph (#574)', async () => {
        await renderTenantTab();
        const user = userEvent.setup();

        await findSendButton('Direkt Versenden');
        await user.click(screen.getByRole('button', { name: 'Sendeoptionen' }));

        const entry = await screen.findByRole('menuitem', { name: 'Direkt Versenden' });
        expect(entry.querySelector('[data-glyph]')).toHaveAttribute('data-glyph', 'mail-filled');
    });

    it('persists the chosen send mode per tab and swaps the main label', async () => {
        const view = renderTenantTab();
        const user = userEvent.setup();

        await findSendButton('Direkt Versenden');
        await user.click(screen.getByRole('button', { name: 'Sendeoptionen' }));
        await user.click(await screen.findByRole('menuitem', { name: 'Empfänger nur anlegen' }));

        expect(await findSendButton('Empfänger nur anlegen')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Direkt Versenden' })).not.toBeInTheDocument();
        expect(window.localStorage.getItem(sendModeStorageKey('TENANT_ADMIN'))).toBe('createOnly');

        // Survives a full remount (page reload) via localStorage.
        view.unmount();
        renderTenantTab();
        expect(await findSendButton('Empfänger nur anlegen')).toBeInTheDocument();
    });

    it('posts WITHOUT templateId in create-only mode', async () => {
        window.localStorage.setItem(sendModeStorageKey('TENANT_ADMIN'), 'createOnly');
        mocks.createAccountInvite.mockResolvedValue({ id: 99 });

        renderTenantTab();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = await findSendButton('Empfänger nur anlegen');
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        const payload = mocks.createAccountInvite.mock.calls[0][0];
        expect(payload.templateId).toBeUndefined();
        expect(payload.recipientEmail).toBe('neu@example.org');
        expect(await screen.findByText('Recipient created without sending an email')).toBeInTheDocument();
        // Successful submit clears the recipient fields for the next invite.
        expect(screen.getByLabelText('E-Mail')).toHaveValue('');
    });

    it('starts visibly on Auto and posts allocationMode AUTO without a browser-pinned id (#570)', async () => {
        mocks.createAccountInvite.mockResolvedValue({ id: 99 });

        renderTenantTab();
        const user = userEvent.setup();

        const idInput = await screen.findByRole('textbox', { name: 'Träger-ID' });
        expect(idInput).toHaveValue('Auto');
        expect(screen.queryByText('Die nächste freie ID wird automatisch vergeben.')).not.toBeInTheDocument();

        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = await findSendButton('Direkt Versenden');
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        const payload = mocks.createAccountInvite.mock.calls[0][0];
        expect(payload.tenantIdAllocationMode).toBe('AUTO');
        expect(payload.tenantId).toBeUndefined();
        // After a successful submit the field rests on Auto again.
        expect(screen.getByRole('textbox', { name: 'Träger-ID' })).toHaveValue('Auto');
    });

    it('blocks sending on a reserved id and unblocks via the Auto toggle (#570)', async () => {
        mocks.tenantIdAllocationClient.checkIdAvailability.mockResolvedValue({ id: 30, state: 'RESERVED' });

        renderTenantTab();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = await findSendButton('Direkt Versenden');
        await waitFor(() => expect(sendButton).toBeEnabled());

        await user.type(screen.getByRole('textbox', { name: 'Träger-ID' }), '30');
        expect(await screen.findByText('Diese ID ist durch eine offene Einladung reserviert.')).toBeInTheDocument();
        await waitFor(() => expect(sendButton).toBeDisabled());

        await user.click(screen.getByRole('button', { name: 'Automatische ID-Vergabe' }));
        expect(screen.getByRole('textbox', { name: 'Träger-ID' })).toHaveValue('Auto');
        await waitFor(() => expect(sendButton).toBeEnabled());
    });

    it('adopts the current next free id on the first arrow click and posts MANUAL (#570)', async () => {
        mocks.createAccountInvite.mockResolvedValue({ id: 99 });

        renderTenantTab();
        const user = userEvent.setup();

        await screen.findByRole('textbox', { name: 'Träger-ID' });
        await user.click(screen.getByRole('button', { name: 'Wert erhöhen' }));

        await waitFor(() => expect(screen.getByRole('textbox', { name: 'Träger-ID' })).toHaveValue('21'));
        expect(mocks.tenantIdAllocationClient.nextFreeId).toHaveBeenCalledWith({ direction: 'up' });
        // A free id is the expected case and says nothing an admin has to act on,
        // so it no longer produces a supporting line at all.
        expect(screen.queryByText('ID {{id}} ist frei.')).not.toBeInTheDocument();

        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = await findSendButton('Direkt Versenden');
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        const payload = mocks.createAccountInvite.mock.calls[0][0];
        expect(payload.tenantIdAllocationMode).toBe('MANUAL');
        expect(payload.tenantId).toBe(21);
    });

    it('parses a picked CSV client-side and opens the preview modal (#315)', async () => {
        renderTenantTab();
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: 'Weitere Aktionen' }));
        await screen.findByText('CSV-Datei importieren');

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        await user.upload(
            fileInput,
            new File(['maria@example.org,Maria,Huber\n'], 'invites.csv', { type: 'text/csv' }),
        );

        // The preview modal opened with the one parsed recipient in its batch. The
        // mocked `t` returns raw fallbacks, so the count stays uninterpolated here.
        expect(await screen.findByRole('button', { name: '{{count}} Empfänger anlegen' })).toBeInTheDocument();
        expect(mocks.createAccountInvite).not.toHaveBeenCalled();
    });

    /*
     * #713: Pre-Dev carries TWO active TENANT_INVITE templates, so the tab's
     * "exactly one active template" auto-select never fires and nothing is
     * preselected. That is a genuine precondition — but the composer used to
     * show a silently greyed-out send button with no validation text at all
     * (`.ant-form-item-explain` and `[role="alert"]` both empty). Disable
     * rather than hide, but ALWAYS explain.
     */
    it('names the missing precondition while the send action is disabled (#713)', async () => {
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE, { ...TEMPLATE, id: 8, name: 'Zweite Vorlage' }]);

        renderTenantTab();
        const user = userEvent.setup();

        const sendButton = await findSendButton('Direkt Versenden');
        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');

        // E-mail is valid and the Träger-ID rests on Auto, yet send stays off:
        // no template is selected because two are active.
        await waitFor(() => expect(sendButton).toBeDisabled());
        const hint = await screen.findByText('Bitte zuerst eine E-Mail-Vorlage auswählen.');
        expect(hint).toBeInTheDocument();
        expect(sendButton).toHaveAccessibleDescription('Bitte zuerst eine E-Mail-Vorlage auswählen.');
    });

    it('opens the templates dialog in list view from the template pill', async () => {
        renderTenantTab();
        const user = userEvent.setup();

        const templatePill = await screen.findByRole('button', { name: /Standard/ });
        await user.click(templatePill);

        expect(await screen.findByTestId('templates-dialog')).toHaveTextContent('list');
    });

    /*
     * #746: the template pill is the module's TemplateSplitButton — the chevron
     * menu switches the active template directly (marked with the check), the
     * main segment still opens the manage/pick dialog.
     */
    it('selects the active template from the pill menu (module split-button semantics, #746)', async () => {
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE, { ...TEMPLATE, id: 8, name: 'Zweite Vorlage' }]);
        mocks.createAccountInvite.mockResolvedValue({ id: 99 });

        renderTenantTab();
        const user = userEvent.setup();

        // Two active templates: nothing preselected, the pill rests on its fallback label.
        expect(await screen.findByRole('button', { name: /Vorlage wählen/ })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /^Zweite Vorlage$/ }));

        // Selection is lifted to the tab and re-labels the pill…
        expect(await screen.findByRole('button', { name: /Zweite Vorlage/ })).toBeInTheDocument();

        // …and the send call uses exactly that template.
        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = await findSendButton('Direkt Versenden');
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0].templateId).toBe(8);
    });

    /*
     * P3 (Problem 3): a recipient address that already belongs to a registered
     * user must be refused when the invite is CREATED, not first at redemption —
     * where the invitee had already filled in everything, registered and
     * forwarded the contract before hitting the dead-end page. The backend
     * answers 409 + X-Reason: EMAIL_NOT_AVAILABLE; the composer must show that
     * inline on the e-mail field (not as a global toast) and keep the row
     * filled so the admin only has to correct the address.
     */
    describe('duplicate recipient e-mail (P3)', () => {
        const emailTakenResponse = () =>
            new Response(null, { status: 409, headers: { 'X-Reason': 'EMAIL_NOT_AVAILABLE' } });

        it('blocks "Direkt Versenden" (option A) with an inline field error', async () => {
            mocks.createAccountInvite.mockRejectedValue(emailTakenResponse());

            renderTenantTab();
            const user = userEvent.setup();

            const emailField = await screen.findByLabelText('E-Mail');
            await user.type(emailField, 'taken@example.org');
            const sendButton = await findSendButton('Direkt Versenden');
            await waitFor(() => expect(sendButton).toBeEnabled());
            await user.click(sendButton);

            // One unified sentence, rendered twice: under the E-Mail field AND
            // as the send hint under the bar.
            expect(
                await screen.findAllByText(
                    'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
                ),
            ).toHaveLength(2);
            // Inline, not a global toast: the generic create-failed toast must not appear.
            expect(screen.queryByText('Could not create link')).not.toBeInTheDocument();
            // The row keeps its values — nothing the admin typed is thrown away.
            expect(screen.getByLabelText('E-Mail')).toHaveValue('taken@example.org');
            // And a second click cannot re-post the same address.
            await waitFor(() => expect(sendButton).toBeDisabled());
        });

        it('blocks "Empfänger nur anlegen" (option B) with the same inline error', async () => {
            window.localStorage.setItem(sendModeStorageKey('TENANT_ADMIN'), 'createOnly');
            mocks.createAccountInvite.mockRejectedValue(emailTakenResponse());

            renderTenantTab();
            const user = userEvent.setup();

            await user.type(await screen.findByLabelText('E-Mail'), 'taken@example.org');
            const sendButton = await findSendButton('Empfänger nur anlegen');
            await waitFor(() => expect(sendButton).toBeEnabled());
            await user.click(sendButton);

            expect(
                await screen.findAllByText(
                    'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
                ),
            ).toHaveLength(2);
            expect(screen.queryByText('Could not create link')).not.toBeInTheDocument();
            expect(mocks.createAccountInvite.mock.calls[0][0].templateId).toBeUndefined();
        });

        it('clears the inline error once a different address is entered', async () => {
            mocks.createAccountInvite.mockRejectedValueOnce(emailTakenResponse());

            renderTenantTab();
            const user = userEvent.setup();

            const emailField = await screen.findByLabelText('E-Mail');
            await user.type(emailField, 'taken@example.org');
            const sendButton = await findSendButton('Direkt Versenden');
            await waitFor(() => expect(sendButton).toBeEnabled());
            await user.click(sendButton);
            await screen.findAllByText(
                'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
            );

            await user.clear(emailField);
            await user.type(emailField, 'frei@example.org');

            await waitFor(() =>
                expect(
                    screen.queryAllByText(
                        'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
                    ),
                ).toHaveLength(0),
            );
            await waitFor(() => expect(sendButton).toBeEnabled());
        });

        it('re-raises the field error from the client-side pre-check when the taken address is typed again', async () => {
            mocks.createAccountInvite.mockRejectedValueOnce(emailTakenResponse());

            await renderTenantTab();
            const user = userEvent.setup();

            const emailField = await screen.findByLabelText('E-Mail');
            await user.type(emailField, 'taken@example.org');
            const sendButton = await findSendButton('Direkt Versenden');
            await waitFor(() => expect(sendButton).toBeEnabled());
            await user.click(sendButton);
            await screen.findAllByText(
                'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
            );

            // Correct it away, then type the SAME refused address again.
            await user.clear(emailField);
            await user.type(emailField, 'frei@example.org');
            await waitFor(() =>
                expect(
                    screen.queryAllByText(
                        'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
                    ),
                ).toHaveLength(0),
            );
            await user.clear(emailField);
            await user.type(emailField, 'taken@example.org');

            // The pre-check alone (no new server call) blocks the send and puts the
            // actionable explanation back under the field AND under the bar.
            expect(
                await screen.findAllByText(
                    'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
                ),
            ).toHaveLength(2);
            await waitFor(() => expect(sendButton).toBeDisabled());
            expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1);
        });

        it('still shows the tenant-ID message for a 409 without that reason', async () => {
            mocks.createAccountInvite.mockRejectedValue(new Response(null, { status: 409 }));

            renderTenantTab();
            const user = userEvent.setup();

            await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
            const sendButton = await findSendButton('Direkt Versenden');
            await waitFor(() => expect(sendButton).toBeEnabled());
            await user.click(sendButton);

            expect(await screen.findByText('This tenant ID is already taken.')).toBeInTheDocument();
            expect(
                screen.queryAllByText(
                    'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
                ),
            ).toHaveLength(0);
        });
    });

    it('opens the create view prefilled from the pill menu\'s "Neu aus" entry (#746 review)', async () => {
        renderTenantTab();
        const user = userEvent.setup();

        await screen.findByRole('button', { name: /Standard/ });
        await user.click(screen.getByRole('button', { name: 'Vorlagenmenü öffnen' }));
        await user.click(await screen.findByRole('menuitem', { name: /Neu aus „Standard“/ }));

        // The dialog opens straight in create mode with template 7 as the source.
        expect(await screen.findByTestId('templates-dialog')).toHaveTextContent('create:7');
    });
});
