import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import splitButtonStyles from '../../components/GlobalSearch/splitButton.module.scss';
// Imported statically, NOT with `await import(...)` inside a test: every `vi.mock`
// below is hoisted above this line, so the mocks still apply, while a dynamic
// import would bill the transform + evaluation of this tab's module graph
// (~12.5s idle, 15.4s under a 4-worker run) to whichever test happens to load it
// first. That is what timed out AccountInvitesTab.test.tsx on CI.
import { CounsellorInvitesTab, TenantInvitesTab } from './AccountInvitesTab';

// CI runners are heavily contended; the 1s default for findBy*/waitFor flakes there.
configure({ asyncUtilTimeout: 10_000 });

// antd's Modal/Dropdown/Table query matchMedia, which jsdom does not implement.
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

// Interpolating t-mock so counts and e-mail lists land in the asserted strings.
const t = (key: string, fallback?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
    let text = typeof fallback === 'string' ? fallback : key;
    const values = typeof fallback === 'object' ? fallback : options;
    Object.entries(values ?? {}).forEach(([name, value]) => {
        text = text.replaceAll(`{{${name}}}`, String(value));
    });
    return text;
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

// Unlike the composer/tab tests, the REAL ListingTable renders here — the row
// checkboxes (antd rowSelection) are exactly what is under test.
vi.mock('./EmailTemplatesDialog', () => ({
    EmailTemplatesDialog: () => null,
}));

const mocks = vi.hoisted(() => ({
    previewInviteEmailTemplateContent: vi.fn().mockResolvedValue({
        subject: 'preview',
        html: '<html><body>preview</body></html>',
        plainText: 'preview',
    }),
    listAccountInvites: vi.fn(),
    createAccountInvite: vi.fn(),
    sendAccountInvite: vi.fn(),
    resendAccountInvite: vi.fn(),
    revokeAccountInvite: vi.fn(),
    listInviteEmailTemplates: vi.fn(),
    searchTenantData: vi.fn(),
    parseUserAuthInfo: vi.fn(),
}));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    accountInviteAcceptBaseUrl: 'https://admin.example/account-invite',
    acceptBaseUrlForRole: () => 'https://admin.example/account-invite',
    listAccountInvites: mocks.listAccountInvites,
    createAccountInvite: mocks.createAccountInvite,
    sendAccountInvite: mocks.sendAccountInvite,
    resendAccountInvite: mocks.resendAccountInvite,
    revokeAccountInvite: mocks.revokeAccountInvite,
    listInviteEmailTemplates: mocks.listInviteEmailTemplates,
    // E2: the editor's preview is rendered by the backend. Without this the real
    // fetch would run under jsdom — which is a load-dependent hang, not an
    // honest failure. (Same omission #751 had; see the preview mock there.)
    previewInviteEmailTemplateContent: mocks.previewInviteEmailTemplateContent,
}));

vi.mock('../../api/tenant/searchTenantData', () => ({
    searchTenantData: mocks.searchTenantData,
}));

vi.mock('../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: mocks.parseUserAuthInfo,
}));

const TEMPLATE = {
    id: 7,
    kind: 'COUNSELLOR_INVITE',
    name: 'Standard',
    language: 'de',
    subject: 'S',
    body: 'B',
    active: true,
    createDate: '2026-07-01T00:00:00Z',
    updateDate: null,
};

const invite = (id: number, inviteStatus: string, recipientEmail = `person${id}@example.org`) => ({
    id,
    targetRole: 'COUNSELLOR',
    tenantId: 1,
    recipientEmail,
    firstName: null,
    lastName: null,
    agencyId: null,
    departmentId: null,
    provisioningStatus: null,
    inviteStatus,
    emailVerificationStatus: 'PENDING',
    emailDeliveryStatus: null,
    twoFactorStatus: 'NOT_REQUIRED',
    accessGateStatus: 'BLOCKED_INVITE',
    expiresAt: null,
    acceptedAt: null,
    revokedAt: null,
    supersededAt: null,
    twoFactorWaivedBy: null,
    twoFactorWaivedAt: null,
    twoFactorWaiverReason: null,
    createDate: '2026-07-01T00:00:00Z',
});

const invitesPage = (content: unknown[]) => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    page: 0,
    size: 20,
});

const MIXED_INVITES = [invite(21, 'DRAFT'), invite(22, 'EMAIL_SENT'), invite(23, 'ACCEPTED'), invite(24, 'REVOKED')];

const renderCounsellorTab = () => render(<CounsellorInvitesTab />);

const renderTenantTab = () => render(<TenantInvitesTab />);

const rowCheckbox = async (email: string) => {
    const row = (await screen.findByText(email)).closest('tr') as HTMLElement;
    return within(row).getByRole('checkbox');
};

describe('AccountInvitesTab bulk selection (#316)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({});
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        mocks.listAccountInvites.mockResolvedValue(invitesPage(MIXED_INVITES));
    });

    it('renders the German send-state chips for every invite status', async () => {
        mocks.listAccountInvites.mockResolvedValue(
            invitesPage([...MIXED_INVITES, invite(25, 'EXPIRED'), invite(26, 'SUPERSEDED')]),
        );
        renderCounsellorTab();

        // Scoped to the table: the same labels also exist as filter chips above it.
        await screen.findByText('person21@example.org');
        const table = within(screen.getByRole('table'));
        expect(table.getByText('Draft')).toBeInTheDocument();
        expect(table.getByText('Gesendet')).toBeInTheDocument();
        expect(table.getByText('Angenommen')).toBeInTheDocument();
        expect(table.getByText('Widerrufen')).toBeInTheDocument();
        expect(table.getByText('Abgelaufen')).toBeInTheDocument();
        expect(table.getByText('Ersetzt')).toBeInTheDocument();
    });

    it('only offers checkboxes for DRAFT and EMAIL_SENT rows; terminal rows are disabled', async () => {
        renderCounsellorTab();

        expect(await rowCheckbox('person21@example.org')).toBeEnabled();
        expect(await rowCheckbox('person22@example.org')).toBeEnabled();
        expect(await rowCheckbox('person23@example.org')).toBeDisabled();
        expect(await rowCheckbox('person24@example.org')).toBeDisabled();
    });

    // Same headroom as the revocation chain below: this drives two antd menus
    // plus row checkboxes and has hit the 30s default on slow CI runners
    // (flaked on the #997 PR with the identical commit green in sibling runs).
    it(
        'disables "Ausgewählte löschen" without a selection and surfaces the selection count',
        { timeout: 90_000 },
        async () => {
            renderCounsellorTab();
            const user = userEvent.setup();

            await user.click(await screen.findByRole('button', { name: 'Weitere Aktionen' }));
            const disabledEntry = await screen.findByRole('menuitem', { name: /Ausgewählte löschen/ });
            expect(disabledEntry).toHaveAttribute('aria-disabled', 'true');
            await user.keyboard('{Escape}');

            await user.click(await rowCheckbox('person21@example.org'));
            await user.click(await rowCheckbox('person22@example.org'));
            expect(await screen.findByText('2 ausgewählt')).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));
            const enabledEntry = await screen.findByRole('menuitem', { name: /Ausgewählte löschen/ });
            expect(enabledEntry).not.toHaveAttribute('aria-disabled', 'true');
        },
    );

    // Longest interaction chain in the file — CI runners need headroom beyond the 30s default.
    it(
        'confirming the dialog revokes each selected id and collects failures into one summary',
        { timeout: 90_000 },
        async () => {
            mocks.revokeAccountInvite.mockImplementation((id: number) =>
                id === 22 ? Promise.reject(new Error('boom')) : Promise.resolve(invite(id, 'REVOKED')),
            );
            renderCounsellorTab();
            const user = userEvent.setup();

            await user.click(await rowCheckbox('person21@example.org'));
            await user.click(await rowCheckbox('person22@example.org'));
            await user.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));
            await user.click(await screen.findByRole('menuitem', { name: /Ausgewählte löschen/ }));

            // House modal: title/body/labels resolve via i18n keys (real locales carry
            // the German "Widerrufen" wording — revoke IS the delete here).
            expect(await screen.findByText('links.bulk.deleteConfirmTitle')).toBeInTheDocument();
            expect(screen.getByText('links.bulk.deleteConfirmBody')).toBeInTheDocument();
            expect(mocks.revokeAccountInvite).not.toHaveBeenCalled();

            await user.click(screen.getByRole('button', { name: 'links.bulk.deleteConfirmOk' }));

            await waitFor(() => expect(mocks.revokeAccountInvite).toHaveBeenCalledTimes(2));
            expect(mocks.revokeAccountInvite).toHaveBeenCalledWith(21);
            expect(mocks.revokeAccountInvite).toHaveBeenCalledWith(22);
            expect(await screen.findByText('1 widerrufen, 1 fehlgeschlagen: person22@example.org')).toBeInTheDocument();
            // Table refresh + cleared selection.
            await waitFor(() => expect(mocks.listAccountInvites.mock.calls.length).toBeGreaterThanOrEqual(2));
            expect(screen.queryByText('2 ausgewählt')).not.toBeInTheDocument();
        },
    );

    it('bulk send uses /send for a never-sent DRAFT and /resend only for an already sent invite', async () => {
        mocks.sendAccountInvite.mockImplementation((id: number) => Promise.resolve(invite(id, 'EMAIL_SENT')));
        mocks.resendAccountInvite.mockImplementation((id: number) => Promise.resolve(invite(id, 'EMAIL_SENT')));
        renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org')); // DRAFT
        await user.click(await rowCheckbox('person22@example.org')); // EMAIL_SENT

        const sendButton = await screen.findByRole('button', { name: '2 ausgewählte senden' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        // A DRAFT has never been mailed, so /resend would SUPERSEDE it: the row
        // dies as "Ersetzt" and a replacement invite id appears. Only /send is
        // the first delivery of a draft.
        await waitFor(() => expect(mocks.sendAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.sendAccountInvite).toHaveBeenCalledWith(21, {
            acceptBaseUrl: 'https://admin.example/account-invite',
            templateId: 7,
        });
        expect(mocks.resendAccountInvite).toHaveBeenCalledTimes(1);
        expect(mocks.resendAccountInvite).toHaveBeenCalledWith(22, {
            acceptBaseUrl: 'https://admin.example/account-invite',
            templateId: 7,
        });
        expect(mocks.createAccountInvite).not.toHaveBeenCalled();
        expect(await screen.findByText('2 Einladungen gesendet')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText('2 ausgewählt')).not.toBeInTheDocument());
        // Back in single-create mode once nothing is selected.
        expect(await screen.findByRole('button', { name: 'Direkt Versenden' })).toBeInTheDocument();
    });
    // A3 / B3 / B4: the counter is the ONLY send affordance in multi-select, so
    // a dead one has to look dead. Tonal is reserved for "this can fire now".
    it('renders the multi-select counter outlined + disabled and names why it cannot send', async () => {
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE, { ...TEMPLATE, id: 8, name: 'Zweite Vorlage' }]);
        renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org'));

        const counter = await screen.findByRole('button', { name: '1 ausgewählte senden' });
        const wrapper = counter.closest(`.${splitButtonStyles.splitButton}`) as HTMLElement;
        expect(counter).toBeDisabled();
        expect(wrapper).toHaveClass(splitButtonStyles.outlined);
        expect(wrapper).not.toHaveClass(splitButtonStyles.tonal);
        expect(await screen.findByText('Bitte zuerst eine E-Mail-Vorlage auswählen.')).toBeInTheDocument();
        expect(counter).toHaveAccessibleDescription('Bitte zuerst eine E-Mail-Vorlage auswählen.');
    });

    it('turns the counter tonal once a template is chosen and it can actually send', async () => {
        renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org'));

        const counter = await screen.findByRole('button', { name: '1 ausgewählte senden' });
        const wrapper = counter.closest(`.${splitButtonStyles.splitButton}`) as HTMLElement;
        await waitFor(() => expect(counter).toBeEnabled());
        expect(wrapper).toHaveClass(splitButtonStyles.tonal);
        expect(wrapper).not.toHaveClass(splitButtonStyles.outlined);
    });

    // B5: the send-mode menu ("Direkt Versenden" / "Empfänger nur anlegen")
    // only applies to the single-create flow, so its chevron is dead weight on
    // the selection counter.
    it('drops the send-mode chevron in multi-select and keeps the clear-selection one', async () => {
        renderCounsellorTab();
        const user = userEvent.setup();

        expect(await screen.findByRole('button', { name: 'Sendeoptionen' })).toBeInTheDocument();

        await user.click(await rowCheckbox('person21@example.org'));

        await screen.findByRole('button', { name: '1 ausgewählte senden' });
        expect(screen.queryByRole('button', { name: 'Sendeoptionen' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Auswahl aufheben' })).toBeInTheDocument();
    });
    // A4: the toolbar search pill rendered, took input and threw it away — no
    // value, no callback, no filtering anywhere. Frank's "Fish" returned nothing
    // because nothing was ever asked.
    it('filters the board by the toolbar search across e-mail, name and Träger-ID', async () => {
        mocks.listAccountInvites.mockResolvedValue(
            invitesPage([
                { ...invite(31, 'EMAIL_SENT', 'karla.fischer@example.org'), firstName: 'Karla', lastName: 'Fischer' },
                { ...invite(32, 'EMAIL_SENT', 'ronny.bauer@example.org'), firstName: 'Ronny', lastName: 'Bauer' },
            ]),
        );
        renderCounsellorTab();
        const user = userEvent.setup();

        await screen.findByText('karla.fischer@example.org');
        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        await user.type(await screen.findByRole('textbox', { name: 'Einladungen durchsuchen' }), 'fisch');

        await waitFor(() => expect(screen.queryByText('ronny.bauer@example.org')).not.toBeInTheDocument());
        expect(screen.getByText('Karla Fischer')).toBeInTheDocument();
    });

    // A4 × B: the search and the bulk selection are two filters over one list,
    // and they disagreed. Selecting a row and then typing a query that hides it
    // left the row selected and every bulk action pointed at it — including
    // "Ausgewählte löschen", which REVOKES. A destructive action must never run
    // on a row the operator can no longer see.
    it('drops a row from the bulk selection once the search hides it', async () => {
        renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org'));
        await user.click(await rowCheckbox('person22@example.org'));
        expect(await screen.findByText('2 ausgewählt')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        await user.type(await screen.findByRole('textbox', { name: 'Einladungen durchsuchen' }), 'person21@');

        // Only person21 is still listed, so only person21 is still selected.
        await waitFor(() => expect(screen.queryByText('person22@example.org')).not.toBeInTheDocument());
        expect(await screen.findByText('1 ausgewählt')).toBeInTheDocument();
    });

    it('empties the bulk selection when the search hides every selected row', async () => {
        renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org'));
        expect(await screen.findByText('1 ausgewählt')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        await user.type(
            await screen.findByRole('textbox', { name: 'Einladungen durchsuchen' }),
            'kein-treffer-fuer-diese-abfrage',
        );

        await waitFor(() => expect(screen.queryByText('person21@example.org')).not.toBeInTheDocument());
        // The counter is gone, so the send control is back in single-create mode
        // and "Ausgewählte löschen" is disabled again.
        await waitFor(() => expect(screen.queryByText(/ausgewählt$/)).not.toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));
        expect(await screen.findByRole('menuitem', { name: /Ausgewählte löschen/ })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    // A4: Frank's original report ("Fish" typed into the search returned
    // nothing) turned out to be the search doing nothing at all — fixed above
    // for e-mail+name together. This is the end-to-end validation he asked
    // for on top: every field the search claims to cover, checked one at a
    // time, on the actual Träger-Invites screen the finding was taken from
    // (not the counsellor tab), because Träger-ID only exists there.
    it('matches on every field the search claims to cover: e-mail, first name, last name and Träger-ID', async () => {
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(
            invitesPage([
                {
                    ...invite(41, 'EMAIL_SENT', 'amina.yildiz@example.org'),
                    targetRole: 'TENANT_ADMIN',
                    firstName: 'Amina',
                    lastName: 'Yildiz',
                    tenantId: 42,
                },
                {
                    ...invite(51, 'EMAIL_SENT', 'bruno.schmidt@example.org'),
                    targetRole: 'TENANT_ADMIN',
                    firstName: 'Bruno',
                    lastName: 'Schmidt',
                    tenantId: 99,
                },
            ]),
        );
        renderTenantTab();
        const user = userEvent.setup();

        await screen.findByText('amina.yildiz@example.org');
        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        const search = await screen.findByRole('textbox', { name: 'Einladungen durchsuchen' });

        const onlyAminaVisible = async () => {
            await waitFor(() => expect(screen.queryByText('bruno.schmidt@example.org')).not.toBeInTheDocument());
            expect(screen.getByText('Amina Yildiz')).toBeInTheDocument();
        };

        // E-mail.
        await user.type(search, 'amina.yildiz@example.org');
        await onlyAminaVisible();
        await user.clear(search);

        // First name.
        await user.type(search, 'Amina');
        await onlyAminaVisible();
        await user.clear(search);

        // Last name.
        await user.type(search, 'Yildiz');
        await onlyAminaVisible();
        await user.clear(search);

        // Träger-ID.
        await user.type(search, '42');
        await onlyAminaVisible();
    });

    it('shows the filtered-empty state for a term that genuinely matches nothing', async () => {
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(
            invitesPage([{ ...invite(41, 'EMAIL_SENT', 'amina.yildiz@example.org'), targetRole: 'TENANT_ADMIN' }]),
        );
        renderTenantTab();
        const user = userEvent.setup();

        await screen.findByText('amina.yildiz@example.org');
        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        await user.type(
            await screen.findByRole('textbox', { name: 'Einladungen durchsuchen' }),
            'kein-solcher-treffer',
        );

        await waitFor(() => expect(screen.queryByText('amina.yildiz@example.org')).not.toBeInTheDocument());
        expect(await screen.findByText('Keine Einladungen für diesen Filter.')).toBeInTheDocument();
    });

    // B6: Frank saw a DRAFT row appear checked "without having selected it".
    // Reproduced two ways — a status/bucket FILTER CHIP hiding the row, and
    // the SEARCH box hiding it — both leaving the selection un-pruned so the
    // row comes back still checked with no click on its own checkbox either
    // time. The chip/tile variant is already covered by open PR #766 ("guard
    // stale invite loads and prune selection on filter change"); this file
    // covers the search variant that PR predates and does not reach.
    it('does not resurrect a stale selection when the search hides then reshows the row', async () => {
        renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org')); // DRAFT
        expect(await screen.findByText('1 ausgewählt')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Suche ausklappen' }));
        const search = await screen.findByRole('textbox', { name: 'Einladungen durchsuchen' });
        await user.type(search, 'kein-treffer-fuer-diese-abfrage');
        await waitFor(() => expect(screen.queryByText('person21@example.org')).not.toBeInTheDocument());
        expect(screen.queryByText('1 ausgewählt')).not.toBeInTheDocument();

        // Clearing the search brings person21 back — it must NOT be pre-checked.
        await user.clear(search);
        expect(await rowCheckbox('person21@example.org')).not.toBeChecked();
        expect(screen.queryByText('1 ausgewählt')).not.toBeInTheDocument();
    });
});

/*
 * 403 role surfacing beyond create (UserService#1006): resend and both bulk-send
 * delivery verbs (/send for DRAFT, /resend for EMAIL_SENT) must explain a role
 * rejection — preferring the backend's own message, falling back to the
 * role-appropriate translated hint — instead of the generic failure texts.
 */
describe('403 role surfacing on resend and bulk send (UserService#1006)', () => {
    const forbiddenWithMessage = () =>
        new Response(JSON.stringify({ message: 'Only platform admins can create administrative accounts' }), {
            status: 403,
        });

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({});
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        mocks.listAccountInvites.mockResolvedValue(invitesPage(MIXED_INVITES));
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
    });

    const rowResendButton = async (email: string) => {
        const row = (await screen.findByText(email)).closest('tr') as HTMLElement;
        return within(row).getByRole('button', { name: 'Erinnerung erneut senden' });
    };

    it('shows the backend message when a resend is answered 403', { timeout: 90_000 }, async () => {
        mocks.resendAccountInvite.mockRejectedValue(forbiddenWithMessage());
        await renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowResendButton('person22@example.org'));

        expect(await screen.findByText('Only platform admins can create administrative accounts')).toBeInTheDocument();
        expect(screen.queryByText('Could not resend invite')).not.toBeInTheDocument();
    });

    it('falls back to the counsellor wording on a bodyless resend 403', { timeout: 90_000 }, async () => {
        mocks.resendAccountInvite.mockRejectedValue(new Response(null, { status: 403 }));
        await renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowResendButton('person22@example.org'));

        expect(
            await screen.findByText('Ihre Rolle ist nicht berechtigt, Berater*innen einzuladen.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Could not resend invite')).not.toBeInTheDocument();
    });

    it('keeps the generic resend-failed toast for non-403 failures', { timeout: 90_000 }, async () => {
        mocks.resendAccountInvite.mockRejectedValue(new Error('network down'));
        await renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowResendButton('person22@example.org'));

        expect(await screen.findByText('Could not resend invite')).toBeInTheDocument();
    });

    it(
        'stops after the first role-level 403 — one toast, no request for the condemned rows',
        { timeout: 90_000 },
        async () => {
            mocks.sendAccountInvite.mockRejectedValue(forbiddenWithMessage());
            mocks.resendAccountInvite.mockRejectedValue(forbiddenWithMessage());
            await renderCounsellorTab();
            const user = userEvent.setup();

            await user.click(await rowCheckbox('person21@example.org')); // DRAFT -> /send
            await user.click(await rowCheckbox('person22@example.org')); // EMAIL_SENT -> /resend

            const sendButton = await screen.findByRole('button', { name: '2 ausgewählte senden' });
            await waitFor(() => expect(sendButton).toBeEnabled());
            await user.click(sendButton);

            // The first 403 already answers for every remaining row (same
            // early-stop as the CSV import): /resend is never even attempted.
            await waitFor(() => expect(mocks.sendAccountInvite).toHaveBeenCalledTimes(1));
            expect(mocks.resendAccountInvite).not.toHaveBeenCalled();
            const roleToasts = await screen.findAllByText('Only platform admins can create administrative accounts');
            expect(roleToasts).toHaveLength(1);
            // The count summary stays — the cause toast comes ON TOP of it, and
            // the skipped row counts as failed.
            expect(
                await screen.findByText('0 gesendet, 2 fehlgeschlagen: person21@example.org, person22@example.org'),
            ).toBeInTheDocument();
        },
    );

    it('delivers up to the 403, then stops: one call per row before it, none after', { timeout: 90_000 }, async () => {
        mocks.listAccountInvites.mockResolvedValue(
            invitesPage([invite(21, 'DRAFT'), invite(22, 'EMAIL_SENT'), invite(25, 'EMAIL_SENT')]),
        );
        mocks.sendAccountInvite.mockImplementation((id: number) => Promise.resolve(invite(id, 'EMAIL_SENT')));
        mocks.resendAccountInvite.mockRejectedValue(forbiddenWithMessage());
        await renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org')); // DRAFT -> /send, succeeds
        await user.click(await rowCheckbox('person22@example.org')); // EMAIL_SENT -> /resend, 403
        await user.click(await rowCheckbox('person25@example.org')); // EMAIL_SENT -> never attempted

        const sendButton = await screen.findByRole('button', { name: '3 ausgewählte senden' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.sendAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.sendAccountInvite).toHaveBeenCalledWith(21, expect.anything());
        // Exactly ONE resend: the 403 on person22 condemns person25 without a request.
        expect(mocks.resendAccountInvite).toHaveBeenCalledTimes(1);
        expect(mocks.resendAccountInvite).toHaveBeenCalledWith(22, expect.anything());
        expect(
            await screen.findByText('1 gesendet, 2 fehlgeschlagen: person22@example.org, person25@example.org'),
        ).toBeInTheDocument();
    });

    it(
        'falls back to the Träger-admin wording for a bodyless bulk-send 403 on the tenant tab',
        { timeout: 90_000 },
        async () => {
            mocks.sendAccountInvite.mockRejectedValue(new Response(null, { status: 403 }));
            mocks.resendAccountInvite.mockRejectedValue(new Response(null, { status: 403 }));
            await renderTenantTab();
            const user = userEvent.setup();

            await user.click(await rowCheckbox('person21@example.org')); // DRAFT -> /send
            await user.click(await rowCheckbox('person22@example.org')); // EMAIL_SENT -> /resend

            const sendButton = await screen.findByRole('button', { name: '2 ausgewählte senden' });
            await waitFor(() => expect(sendButton).toBeEnabled());
            await user.click(sendButton);

            expect(
                await screen.findByText('Nur Plattform-Administratoren können Träger-Admins einladen.'),
            ).toBeInTheDocument();
            // Early-stop on the tenant tab too: the first 403 ends the run.
            expect(mocks.sendAccountInvite).toHaveBeenCalledTimes(1);
            expect(mocks.resendAccountInvite).not.toHaveBeenCalled();
        },
    );
});
