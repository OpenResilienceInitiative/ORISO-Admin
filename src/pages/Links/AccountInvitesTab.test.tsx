import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Imported statically, NOT with `await import(...)` inside a test. Every `vi.mock`
// below is hoisted above this line, so the mocks still apply — but a dynamic
// import inside the first test bills the whole transform + evaluation of this
// tab's module graph (~12.5s on an idle laptop, measured) to that ONE test's
// 30s budget. It fit locally and blew the budget on a loaded CI runner, which
// is why "sends tenant-admin invites with the role-derived accept base URL"
// timed out in CI while every other test in this file stayed under 4s. A static
// import moves that cost into the file's (untimed) collection phase.
import { CounsellorInvitesTab, TenantInvitesTab } from './AccountInvitesTab';

// antd components used by the composer (Dropdown/menus) query matchMedia,
// which jsdom does not implement.
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

// Interpolating t-mock so counts land in the asserted button labels.
const t = (key: string, fallback?: string, options?: Record<string, unknown>) => {
    let text = fallback ?? key;
    Object.entries(options ?? {}).forEach(([name, value]) => {
        text = text.replaceAll(`{{${name}}}`, String(value));
    });
    return text;
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

vi.mock('../../components/ListingTable', () => ({
    ListingTable: () => <div data-testid="listing-table" />,
    listingTableStyles: new Proxy({}, { get: () => undefined }),
}));

// The templates dialog has its own test file; keep this one focused on the tab.
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
    resendAccountInvite: vi.fn(),
    revokeAccountInvite: vi.fn(),
    listInviteEmailTemplates: vi.fn(),
    updateAccountInviteTopicPermission: vi.fn(),
    changeAccountInviteRole: vi.fn(),
    addConsultantRole: vi.fn(),
    searchTenantData: vi.fn(),
    getAgencyDataById: vi.fn(),
    searchInviteAgencies: vi.fn(),
    findInviteTenant: vi.fn(),
    superAdmin: false,
    parseUserAuthInfo: vi.fn(),
    acceptBaseUrlForRole: vi.fn(),
    checkTenantIdAvailability: vi.fn(),
    nextFreeTenantId: vi.fn(),
    checkAgencyIdAvailability: vi.fn(),
    nextFreeAgencyId: vi.fn(),
}));

vi.mock('../../api/accountInvites/accountInvites', () => ({
    accountInviteAcceptBaseUrl: 'https://admin.example/account-invite',
    acceptBaseUrlForRole: mocks.acceptBaseUrlForRole,
    listAccountInvites: mocks.listAccountInvites,
    createAccountInvite: mocks.createAccountInvite,
    resendAccountInvite: mocks.resendAccountInvite,
    revokeAccountInvite: mocks.revokeAccountInvite,
    listInviteEmailTemplates: mocks.listInviteEmailTemplates,
    updateAccountInviteTopicPermission: mocks.updateAccountInviteTopicPermission,
    // E2: the editor's preview is rendered by the backend. Without this the real
    // fetch would run under jsdom — which is a load-dependent hang, not an
    // honest failure. (Same omission #751 had; see the preview mock there.)
    previewInviteEmailTemplateContent: mocks.previewInviteEmailTemplateContent,
}));

vi.mock('../../api/accountInvites/inviteRoles', () => ({
    changeAccountInviteRole: mocks.changeAccountInviteRole,
    addConsultantRole: mocks.addConsultantRole,
}));

vi.mock('../../api/tenant/searchTenantData', () => ({
    searchTenantData: mocks.searchTenantData,
}));

// Keep the REAL AgencyAccessError class: the tab's instanceof check must see
// the same identity the tests reject with.
vi.mock('../../api/agency/getAgencyById', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/agency/getAgencyById')>()),
    default: mocks.getAgencyDataById,
}));

vi.mock('../../api/agency/searchInviteAgencies', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/agency/searchInviteAgencies')>()),
    searchInviteAgencies: mocks.searchInviteAgencies,
}));

// Real role reading, except where a test makes the viewer the platform admin.
vi.mock('../../hooks/useUserRoles.hook', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../hooks/useUserRoles.hook')>();
    return {
        useUserRoles: () =>
            mocks.superAdmin
                ? { ...actual.useUserRoles(), isSuperAdmin: true, hasRole: () => true }
                : actual.useUserRoles(),
    };
});

vi.mock('../../api/tenant/findInviteTenant', () => ({
    findInviteTenant: mocks.findInviteTenant,
}));

vi.mock('../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: mocks.parseUserAuthInfo,
}));

// The composer's ID fields talk to the allocation endpoints (#570); the field
// behaviour has its own test files, but tests that TYPE a manual id need the
// availability check to answer, so the clients are wired to hoisted mocks.
vi.mock('../../api/idAllocation/idAllocation', () => ({
    tenantIdAllocationClient: {
        checkIdAvailability: mocks.checkTenantIdAvailability,
        nextFreeId: mocks.nextFreeTenantId,
    },
    agencyIdAllocationClient: {
        checkIdAvailability: mocks.checkAgencyIdAvailability,
        nextFreeId: mocks.nextFreeAgencyId,
    },
}));

const invitesPage = (content: any[]) => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    page: 0,
    size: 20,
});

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

const invite = (id: number, tenantId: number | null, inviteStatus: string) => ({
    id,
    targetRole: 'TENANT_ADMIN',
    tenantId,
    recipientEmail: `taken${id}@example.org`,
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

const renderTenantTab = () => render(<TenantInvitesTab />);

describe('TenantInvitesTab Träger-ID field', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({});
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/account-invite');
    });

    it('sends tenant-admin invites with the role-derived accept base URL (TEN-INV U6/U8, #890)', async () => {
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.createAccountInvite.mockResolvedValue(invite(1, 21, 'EMAIL_SENT'));
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/admin/tenant-onboarding');

        renderTenantTab();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() =>
            expect(mocks.createAccountInvite).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetRole: 'TENANT_ADMIN',
                    acceptBaseUrl: 'https://admin.example/admin/tenant-onboarding',
                }),
            ),
        );
        expect(mocks.acceptBaseUrlForRole).toHaveBeenCalledWith('TENANT_ADMIN');
    });

    it('starts visibly on Auto instead of a client-side suggestion (#570)', async () => {
        // Even with taken ids around, the field pins nothing in the browser —
        // the backend assigns the smallest free id atomically in AUTO mode.
        mocks.searchTenantData.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }, { id: 4 }], total: 3 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([invite(11, 3, 'DRAFT'), invite(12, 5, 'REVOKED')]));

        renderTenantTab();

        const field = await screen.findByRole('combobox', { name: 'Träger' });
        await waitFor(() => expect(field).toHaveValue('Neu'));
        expect(screen.queryByText('Die nächste freie ID wird automatisch vergeben.')).not.toBeInTheDocument();
    });

    it('shows the dedicated collision message when the backend answers 409', async () => {
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.createAccountInvite.mockRejectedValue(new Response(null, { status: 409 }));

        renderTenantTab();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        // Single active template is auto-selected by the tab; only e-mail is required on top.
        expect(await screen.findByRole('button', { name: /Standard/ })).toBeInTheDocument();
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() =>
            expect(mocks.createAccountInvite).toHaveBeenCalledWith(
                expect.objectContaining({ targetRole: 'TENANT_ADMIN', recipientEmail: 'neu@example.org' }),
            ),
        );
        expect(await screen.findByText('Diese Träger-ID ist bereits vergeben.')).toBeInTheDocument();
    });

    it('does not auto-fill the Träger-ID on the counsellor tab', async () => {
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        render(<CounsellorInvitesTab />);

        const field = await screen.findByRole('combobox', { name: 'Träger' });
        await waitFor(() => expect(mocks.listInviteEmailTemplates).toHaveBeenCalled());
        expect(field).toHaveValue('');
        expect(mocks.searchTenantData).not.toHaveBeenCalled();
    });
});

/*
 * A 403 on create means the admin's ROLE cannot invite admins (UserService#1006:
 * "Only platform admins can create administrative accounts"). Swallowing that
 * into the generic "Could not create link" left the admin guessing — the toast
 * must explain the role problem, preferring the backend's own message.
 */
describe('TenantInvitesTab 403 role surfacing (UserService#1006)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({});
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/account-invite');
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
    });

    const submitInvite = async () => {
        await renderTenantTab();
        const user = userEvent.setup();
        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalled());
    };

    it('shows the backend message when create is answered 403', async () => {
        mocks.createAccountInvite.mockRejectedValue(
            new Response(JSON.stringify({ message: 'Only platform admins can create administrative accounts' }), {
                status: 403,
            }),
        );

        await submitInvite();

        expect(await screen.findByText('Only platform admins can create administrative accounts')).toBeInTheDocument();
        expect(screen.queryByText('Einladung konnte nicht angelegt werden.')).not.toBeInTheDocument();
    });

    it('falls back to the translated role explanation on a bodyless 403', async () => {
        mocks.createAccountInvite.mockRejectedValue(new Response(null, { status: 403 }));

        await submitInvite();

        expect(
            await screen.findByText('Nur Plattform-Administratoren können Träger-Admins einladen.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Einladung konnte nicht angelegt werden.')).not.toBeInTheDocument();
    });

    it('keeps the generic create-failed toast for non-403 failures', async () => {
        mocks.createAccountInvite.mockRejectedValue(new Error('network down'));

        await submitInvite();

        expect(await screen.findByText('Einladung konnte nicht angelegt werden.')).toBeInTheDocument();
    });
});

/*
 * UserService#1160: a 502 `{"reason":"SMTP_SEND_FAILED","detail":<category>}`
 * means the invite was fine and MAIL DELIVERY is broken platform-wide. Before
 * this, the call fell into CATCH_ALL and the admin got two generic toasts, so a
 * misconfigured SMTP looked like a flaky form and admins kept retrying.
 */
describe('TenantInvitesTab SMTP delivery failures (UserService#1160)', () => {
    const smtp502 = (detail?: string) =>
        new Response(JSON.stringify({ reason: 'SMTP_SEND_FAILED', ...(detail ? { detail } : {}) }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({});
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/account-invite');
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
    });

    const submitInvite = async () => {
        renderTenantTab();
        const user = userEvent.setup();
        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalled());
    };

    it.each([
        [
            'SMTP_CREDENTIALS_MISSING',
            'E-Mail-Versand nicht konfiguriert: SMTP-Zugangsdaten fehlen. Bitte Plattform-Admin kontaktieren.',
        ],
        [
            'SMTP_DISABLED_OR_INCOMPLETE',
            'E-Mail-Versand ist deaktiviert oder unvollständig konfiguriert. Bitte Plattform-Admin kontaktieren.',
        ],
        [
            'SMTP_SETTINGS_UNAVAILABLE',
            'E-Mail-Einstellungen konnten nicht geladen werden. Bitte später erneut versuchen oder Plattform-Admin kontaktieren.',
        ],
        ['SMTP_TRANSPORT_FAILED', 'E-Mail-Server hat den Versand abgelehnt. Bitte Plattform-Admin kontaktieren.'],
    ])('shows ONE specific toast for %s', { timeout: 90_000 }, async (detail, expected) => {
        mocks.createAccountInvite.mockRejectedValue(smtp502(detail));

        await submitInvite();

        expect(await screen.findByText(expected)).toBeInTheDocument();
        // No generic toast stacked on top — that is what hid the cause.
        expect(screen.queryByText('Einladung konnte nicht angelegt werden.')).not.toBeInTheDocument();
        expect(screen.queryByText('Invite sent')).not.toBeInTheDocument();
    });

    it('falls back to the neutral delivery message on an unknown category', { timeout: 90_000 }, async () => {
        // Never guess a cause the backend did not name.
        mocks.createAccountInvite.mockRejectedValue(smtp502('SMTP_SOMETHING_NEW'));

        await submitInvite();

        expect(
            await screen.findByText('E-Mail konnte nicht versendet werden. Bitte Plattform-Admin kontaktieren.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Einladung konnte nicht angelegt werden.')).not.toBeInTheDocument();
    });

    it('reloads the list so the row reflects what the backend kept', { timeout: 90_000 }, async () => {
        mocks.createAccountInvite.mockRejectedValue(smtp502('SMTP_CREDENTIALS_MISSING'));

        await submitInvite();

        await waitFor(() => expect(mocks.listAccountInvites.mock.calls.length).toBeGreaterThanOrEqual(2));
    });

    it('keeps the generic create-failed toast for a 502 that is not an SMTP failure', { timeout: 90_000 }, async () => {
        mocks.createAccountInvite.mockRejectedValue(
            new Response(JSON.stringify({ reason: 'SOMETHING_ELSE' }), { status: 502 }),
        );

        await submitInvite();

        expect(await screen.findByText('Einladung konnte nicht angelegt werden.')).toBeInTheDocument();
    });

    it('leaves the 403 role surfacing intact (UserService#1006)', { timeout: 90_000 }, async () => {
        mocks.createAccountInvite.mockRejectedValue(new Response(null, { status: 403 }));

        await submitInvite();

        expect(
            await screen.findByText('Nur Plattform-Administratoren können Träger-Admins einladen.'),
        ).toBeInTheDocument();
    });
});

/*
 * `loadInvites` is called from the mount effect AND after every invite action,
 * so two runs can be in flight at once — each walks several pages, so the older
 * one can finish last. Only the newest run may write the list or clear the
 * loading flag; otherwise a stale response resurrects rows the admin just
 * changed, or hides a spinner while a newer fetch is still running.
 */
describe('overlapping invite loads', () => {
    /** A promise plus its resolver, so a test can decide the completion order. */
    const deferred = <T,>() => {
        let resolve!: (value: T) => void;
        const promise = new Promise<T>((r) => {
            resolve = r;
        });
        return { promise, resolve };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({});
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/account-invite');
        mocks.createAccountInvite.mockResolvedValue(invite(1, 21, 'EMAIL_SENT'));
    });

    /** Fill the composer and send, which triggers the second (newer) load. */
    const sendOneInvite = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);
    };

    it('keeps the newer list when an older load resolves last', async () => {
        const stale = deferred<ReturnType<typeof invitesPage>>();
        mocks.listAccountInvites
            // Mount: slow, and by the time it lands its rows are gone.
            .mockReturnValueOnce(stale.promise)
            // Refresh after the create: fast, and authoritative.
            .mockResolvedValue(invitesPage([invite(1, 21, 'EMAIL_SENT')]));

        renderTenantTab();
        const user = userEvent.setup();
        await sendOneInvite(user);

        expect(await screen.findByText('taken1@example.org')).toBeInTheDocument();

        stale.resolve(invitesPage([]));

        // Without the revision guard the stale empty page would land last and
        // replace the row with the "no invites yet" state.
        await waitFor(() => expect(mocks.listAccountInvites).toHaveBeenCalledTimes(2));
        expect(screen.getByText('taken1@example.org')).toBeInTheDocument();
        expect(screen.queryByText('Noch keine Einladungen')).not.toBeInTheDocument();
    });

    it('does not let an older load clear the loading flag of a newer one', async () => {
        const first = deferred<ReturnType<typeof invitesPage>>();
        const second = deferred<ReturnType<typeof invitesPage>>();
        mocks.listAccountInvites.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

        renderTenantTab();
        const user = userEvent.setup();
        await sendOneInvite(user);
        await waitFor(() => expect(mocks.listAccountInvites).toHaveBeenCalledTimes(2));

        // Settle the older run completely (a macrotask drains every microtask
        // the component chained behind its await) — a `waitFor` would pass on
        // its first poll, before React ever processed the stale update.
        const settle = async (resolve: () => void) => {
            await act(async () => {
                resolve();
                await new Promise((done) => {
                    setTimeout(done, 0);
                });
            });
        };

        // The older run finishes while the newer one is still fetching.
        await settle(() => first.resolve(invitesPage([])));
        expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');

        await settle(() => second.resolve(invitesPage([invite(1, 21, 'EMAIL_SENT')])));
        expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
        expect(screen.getByText('taken1@example.org')).toBeInTheDocument();
    });
});

/* Viewer: tenant admin of Träger 79. Department routing is the backend's job, so no client-side agency lookup. */
describe('CounsellorInvitesTab — invite wiring', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: 79 });
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/account-invite');
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.listInviteEmailTemplates.mockResolvedValue([{ ...TEMPLATE, kind: 'COUNSELLOR_INVITE' }]);
        mocks.createAccountInvite.mockResolvedValue(invite(99, 79, 'EMAIL_SENT'));
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'FREE' });
        mocks.searchInviteAgencies.mockResolvedValue({ hits: [], total: 0, hasMore: false, page: 1 });
        mocks.superAdmin = false;
    });

    /** Fill E-Mail, names and a manual Beratungsstellen-Nr. */
    const fill = async (agencyNumber = '275') => {
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();
        // Sample addresses use example.org, never a domain we really own.
        await user.type(await screen.findByLabelText('E-Mail'), 'lisa.simpson@example.org');
        await user.type(screen.getByLabelText('Vorname'), 'Lisa');
        await user.type(screen.getByLabelText('Name'), 'Simpson');
        await user.type(screen.getByRole('combobox', { name: 'Beratungsstelle' }), agencyNumber);
        return user;
    };

    it('does not let a counsellor found a new agency and offers the BST-Admin invite instead', async () => {
        const user = await fill();

        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        expect(
            await screen.findByText(/Eine neue Beratungsstelle legt nur eine BST-Admin an/, undefined, {
                timeout: 10_000,
            }),
        ).toBeInTheDocument();
        expect(sendButton).toBeDisabled();

        await user.click(screen.getByRole('button', { name: 'Stattdessen als BST-Admin einladen' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Anlegen & einladen' })).toBeEnabled());
        await user.click(screen.getByRole('button', { name: 'Anlegen & einladen' }));

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            targetRole: 'AGENCY_ADMIN',
            alsoCounsellor: true,
            tenantId: 79,
            tenantIdAllocationMode: 'EXISTING',
            agencyId: 275,
            agencyIdAllocationMode: 'MANUAL',
        });
        expect(mocks.createAccountInvite.mock.calls[0][0].topicPermission).toBeUndefined();
        expect(mocks.acceptBaseUrlForRole).toHaveBeenCalledWith('AGENCY_ADMIN');
        expect(mocks.getAgencyDataById).not.toHaveBeenCalled();
    });

    it('resets Rolle to Berater:in after the guided BST-Admin invite went out', async () => {
        const user = await fill();
        await user.click(
            await screen.findByRole('button', { name: 'Stattdessen als BST-Admin einladen' }, { timeout: 10_000 }),
        );
        await waitFor(() => expect(screen.getByRole('button', { name: 'Anlegen & einladen' })).toBeEnabled());
        await user.click(screen.getByRole('button', { name: 'Anlegen & einladen' }));
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));

        // The next person typed into the fresh bar is a counsellor again, not a second BST-Admin.
        await waitFor(() =>
            expect(screen.getByRole('button', { name: /^Rolle bearbeiten/ })).toHaveTextContent('Berater:in'),
        );
        expect(screen.queryByRole('button', { name: /^Berät auch bearbeiten/ })).not.toBeInTheDocument();
    });

    it('starts a fresh page with every field expanded — no pills before anything was chosen', async () => {
        render(<CounsellorInvitesTab />);

        expect(await screen.findByRole('combobox', { name: 'Rolle' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Rolle bearbeiten/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Themen & Fachbereiche bearbeiten/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Vorlage bearbeiten/ })).not.toBeInTheDocument();
    });

    // Each case types and sends a whole invite twice; the parallel CI runner exceeds the 30 s default.
    describe('"Senden & nächste"', { timeout: 90_000 }, () => {
        const chooseSendAndNext = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.click(screen.getByRole('button', { name: 'Sendeoptionen' }));
            await user.click(await screen.findByRole('menuitem', { name: /Senden & nächste/ }));
            return screen.findByRole('button', { name: /& nächste$/ });
        };

        it('keeps Träger, Beratungsstelle, Vorlage and topics, clears the person and focuses E-Mail', async () => {
            mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
            mocks.createAccountInvite.mockResolvedValue({
                ...invite(100, 79, 'WAITING_FOR_UNIT'),
                targetRole: 'COUNSELLOR',
                waitingForUnit: 'AGENCY',
            });
            const user = await fill('900');
            // A deliberate pick of the topic level, so "kept" is observable. (Typing
            // into the bar already folded the select fields into pills.)
            await user.click(screen.getByRole('button', { name: /^Themen & Fachbereiche bearbeiten/ }));
            await user.click(await screen.findByTitle('Darf weitere Fachbereiche auswählen'));

            const send = await chooseSendAndNext(user);
            await waitFor(() => expect(send).toBeEnabled(), { timeout: 10_000 });
            await user.click(send);

            await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
            expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
                targetRole: 'COUNSELLOR',
                agencyId: 900,
                agencyIdAllocationMode: 'MANUAL',
                topicPermission: 'SELECT_EXISTING',
                templateId: 7,
            });

            const email = screen.getByLabelText('E-Mail');
            await waitFor(() => expect(email).toHaveValue(''));
            await waitFor(() => expect(email).toHaveFocus());
            expect(screen.getByLabelText('Vorname')).toHaveValue('');
            expect(screen.getByLabelText('Name')).toHaveValue('');
            // The kept number is re-checked (it may just have been reserved), then folds back into its pill.
            expect(
                await screen.findByRole('button', { name: /^Beratungsstelle bearbeiten/ }, { timeout: 10_000 }),
            ).toHaveAttribute('title', expect.stringContaining('900'));
            expect(screen.getByRole('button', { name: /^Themen & Fachbereiche bearbeiten/ })).toHaveTextContent(
                'Darf weitere Fachbereiche auswählen',
            );
            expect(screen.getByRole('button', { name: /^Vorlage bearbeiten/ })).toHaveTextContent('Standard');
            expect(screen.getByRole('button', { name: 'Anlegen, einladen & nächste' })).toBeInTheDocument();

            // The next person only needs their own fields.
            await user.type(email, 'bart.simpson@example.org');
            await user.type(screen.getByLabelText('Vorname'), 'Bart');
            await user.type(screen.getByLabelText('Name'), 'Simpson');
            await waitFor(
                () => expect(screen.getByRole('button', { name: 'Anlegen, einladen & nächste' })).toBeEnabled(),
                {
                    timeout: 10_000,
                },
            );
            await user.click(screen.getByRole('button', { name: 'Anlegen, einladen & nächste' }));
            await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(2));
            expect(mocks.createAccountInvite.mock.calls[1][0]).toMatchObject({
                recipientEmail: 'bart.simpson@example.org',
                agencyId: 900,
                topicPermission: 'SELECT_EXISTING',
            });
        });

        it('lets the next counsellor wait for the agency a "Neu" founding invite just reserved', async () => {
            mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
            mocks.createAccountInvite.mockResolvedValueOnce({
                ...invite(100, 79, 'EMAIL_SENT'),
                targetRole: 'AGENCY_ADMIN',
                agencyId: 950,
                agencyIdAllocationMode: 'AUTO',
            });
            render(<CounsellorInvitesTab />);
            const user = userEvent.setup();
            await user.type(await screen.findByLabelText('E-Mail'), 'marge.simpson@example.org');
            await user.type(screen.getByLabelText('Vorname'), 'Marge');
            await user.type(screen.getByLabelText('Name'), 'Simpson');
            await user.click(
                await screen.findByRole('button', { name: 'Stattdessen als BST-Admin einladen' }, { timeout: 10_000 }),
            );
            const send = await chooseSendAndNext(user);
            await waitFor(() => expect(send).toBeEnabled(), { timeout: 10_000 });
            await user.click(send);
            await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
            expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
                targetRole: 'AGENCY_ADMIN',
                agencyIdAllocationMode: 'AUTO',
            });

            await waitFor(() => expect(screen.getByLabelText('E-Mail')).toHaveValue(''));
            await user.type(screen.getByLabelText('E-Mail'), 'lisa.simpson@example.org');
            await user.type(screen.getByLabelText('Vorname'), 'Lisa');
            await user.type(screen.getByLabelText('Name'), 'Simpson');
            const next = screen.getByRole('button', { name: /& nächste$/ });
            await waitFor(() => expect(next).toBeEnabled(), { timeout: 10_000 });
            await user.click(next);

            await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(2));
            expect(mocks.createAccountInvite.mock.calls[1][0]).toMatchObject({
                targetRole: 'COUNSELLOR',
                agencyId: 950,
                agencyIdAllocationMode: 'MANUAL',
            });
        });

        it('keeps saying whether the send creates the agency', async () => {
            mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
            const user = await fill('900');
            await chooseSendAndNext(user);
            expect(screen.getByRole('button', { name: 'Anlegen, einladen & nächste' })).toBeInTheDocument();
        });

        it('puts Rolle back to the default role for the next person', async () => {
            mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
            const user = await fill('900');
            await user.click(screen.getByRole('button', { name: /^Rolle bearbeiten/ }));
            await user.click(await screen.findByTitle('BST-Admin'));

            const send = await chooseSendAndNext(user);
            await waitFor(() => expect(send).toBeEnabled(), { timeout: 10_000 });
            await user.click(send);
            await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
            expect(mocks.createAccountInvite.mock.calls[0][0].targetRole).toBe('AGENCY_ADMIN');

            await waitFor(() => expect(screen.getByLabelText('E-Mail')).toHaveValue(''));
            await waitFor(() =>
                expect(screen.getByRole('button', { name: /^Rolle bearbeiten/ })).toHaveTextContent('Berater:in'),
            );
        });

        it('clears nothing when the send fails', async () => {
            mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
            mocks.createAccountInvite.mockRejectedValue(new Response(null, { status: 500 }));
            const user = await fill('900');

            const send = await chooseSendAndNext(user);
            await waitFor(() => expect(send).toBeEnabled(), { timeout: 10_000 });
            await user.click(send);
            await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));

            expect(await screen.findByText('Einladung konnte nicht angelegt werden.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /^E-Mail bearbeiten/ })).toHaveAttribute(
                'title',
                'lisa.simpson@example.org',
            );
            expect(screen.getByRole('button', { name: /^Vorname bearbeiten/ })).toHaveAttribute('title', 'Lisa');
        });
    });

    it('pages the Träger search beyond the first 10', async () => {
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: '0' });
        mocks.superAdmin = true;
        mocks.searchTenantData.mockImplementation(async ({ page }: { page: number }) => ({
            total: 12,
            data:
                page === 1
                    ? Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Träger ${i + 1}` }))
                    : [
                          { id: 11, name: 'Träger 11' },
                          { id: 12, name: 'Träger 12' },
                      ],
        }));
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        await user.click(await screen.findByRole('combobox', { name: 'Träger' }));
        await user.click(await screen.findByRole('option', { name: 'Weitere anzeigen (10 von 12)' }));

        expect(await screen.findByRole('option', { name: /Träger 12/ })).toBeInTheDocument();
        expect(mocks.searchTenantData).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, perPage: 10 }));
    });

    it('takes a typed Träger number only when that Träger exists', async () => {
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: '0' });
        mocks.superAdmin = true;
        mocks.findInviteTenant.mockImplementation(async (id: number) =>
            id === 40 ? { id: 40, name: 'Caritas Springfield' } : null,
        );
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();
        const tenant = await screen.findByRole('combobox', { name: 'Träger' });

        await user.type(tenant, '999');
        expect(await screen.findByText('Keine Einheit mit Nr. 999')).toBeInTheDocument();
        await user.clear(tenant);
        await user.type(tenant, '40');
        await user.tab();

        await waitFor(() => expect(tenant).toHaveValue('Caritas Springfield · 40'));
    });

    it('offers the existing agency behind a taken number', async () => {
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'ASSIGNED' });
        mocks.getAgencyDataById.mockResolvedValue({ _embedded: { id: 275, name: 'Diakonie Lahr', tenantId: 79 } });
        await fill('275');

        expect(
            await screen.findByText(/Nr\. 275 ist „Diakonie Lahr“/, undefined, { timeout: 10_000 }),
        ).toBeInTheDocument();
    });

    it('fills the Träger from an agency taken by its number', async () => {
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: '0' });
        mocks.superAdmin = true;
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'ASSIGNED' });
        mocks.getAgencyDataById.mockResolvedValue({ _embedded: { id: 275, name: 'Diakonie Lahr', tenantId: 79 } });
        const user = await fill('275');
        await user.click(await screen.findByRole('option', { name: /Diakonie Lahr/ }, { timeout: 10_000 }));

        expect(await screen.findByRole('button', { name: /^Träger bearbeiten/ })).toHaveAttribute(
            'title',
            expect.stringContaining('79'),
        );
    });

    it('prefills the topic permission from the chosen agency and sends the value shown', async () => {
        mocks.searchInviteAgencies.mockResolvedValue({
            hits: [{ id: 14, name: 'Diakonie Lahr', tenantId: 79, topics: ['Schulden'] }],
            total: 1,
            hasMore: false,
            page: 1,
        });
        mocks.getAgencyDataById.mockResolvedValue({
            _embedded: { id: 14, settings: { counsellorTopicPermission: 'CREATE' } },
        });
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();
        await user.type(await screen.findByLabelText('E-Mail'), 'lisa.simpson@example.org');
        await user.type(screen.getByLabelText('Vorname'), 'Lisa');
        await user.type(screen.getByLabelText('Name'), 'Simpson');
        await user.type(screen.getByRole('combobox', { name: 'Beratungsstelle' }), 'Diak');
        await user.click(await screen.findByRole('option', { name: /Diakonie Lahr/ }));

        expect((await screen.findAllByText('Darf weitere Themen anlegen')).length).toBeGreaterThan(0);
        const sendButton = screen.getByRole('button', { name: 'Einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            agencyId: 14,
            agencyIdAllocationMode: 'EXISTING',
            topicPermission: 'CREATE',
        });
    });

    it('drops the agency default again when the admin switches to a new agency', async () => {
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
        mocks.searchInviteAgencies.mockResolvedValue({
            hits: [{ id: 14, name: 'Diakonie Lahr', tenantId: 79, topics: ['Schulden'] }],
            total: 1,
            hasMore: false,
            page: 1,
        });
        mocks.getAgencyDataById.mockResolvedValue({
            _embedded: { id: 14, settings: { counsellorTopicPermission: 'CREATE' } },
        });
        const user = await fill('Diak');
        await user.click(await screen.findByRole('option', { name: /Diakonie Lahr/ }));
        expect((await screen.findAllByText('Darf weitere Themen anlegen')).length).toBeGreaterThan(0);

        const agencyField = screen.getByRole('combobox', { name: 'Beratungsstelle' });
        await user.clear(agencyField);
        await user.type(agencyField, '900');
        await user.keyboard('{Escape}');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled(), { timeout: 10_000 });
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            agencyId: 900,
            agencyIdAllocationMode: 'MANUAL',
            topicPermission: 'NONE',
        });
    });

    it.each([
        [
            '400',
            new Response(JSON.stringify({ message: 'tenantId passt nicht zur Beratungsstelle' }), { status: 400 }),
            'tenantId passt nicht zur Beratungsstelle',
        ],
        [
            '404',
            new Error('NO_MATCH'),
            'Diese Beratungsstelle bzw. diesen Träger gibt es nicht (mehr). Bitte neu auswählen.',
        ],
    ])('explains a %s on create and keeps the row', async (_status, failure, text) => {
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
        mocks.createAccountInvite.mockRejectedValue(failure);
        const user = await fill('900');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled(), { timeout: 10_000 });
        await user.click(sendButton);

        expect(await screen.findByText(text, undefined, { timeout: 10_000 })).toBeInTheDocument();
        expect(screen.queryByText('Einladung konnte nicht angelegt werden.')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Vorname bearbeiten: Lisa' })).toBeInTheDocument();
    });

    it('lets a counsellor wait for a new agency whose admin invite is open, and says so', async () => {
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
        mocks.createAccountInvite.mockResolvedValue({
            ...invite(100, 79, 'WAITING_FOR_UNIT'),
            targetRole: 'COUNSELLOR',
            waitingForUnit: 'AGENCY',
        });
        const user = await fill('900');

        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled(), { timeout: 10_000 });
        expect(screen.getByText(/wird mit einer offenen Admin-Einladung angelegt/)).toBeInTheDocument();
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            targetRole: 'COUNSELLOR',
            agencyId: 900,
            agencyIdAllocationMode: 'MANUAL',
            topicPermission: 'NONE',
        });
        expect(mocks.createAccountInvite.mock.calls[0][0].departmentId).toBeUndefined();
        expect(await screen.findByText(/Einladung vorgemerkt/)).toBeInTheDocument();
    });

    it('explains 409 NO_PENDING_UNIT_ADMIN in German', async () => {
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
        mocks.createAccountInvite.mockRejectedValue(
            new Response(null, { status: 409, headers: { 'X-Reason': 'NO_PENDING_UNIT_ADMIN' } }),
        );
        const user = await fill('900');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled(), { timeout: 10_000 });
        await user.click(sendButton);

        expect(
            await screen.findByText(/für sie ist keine BST-Admin-Einladung offen/, undefined, { timeout: 10_000 }),
        ).toBeInTheDocument();
        expect(screen.queryByText('Einladung konnte nicht angelegt werden.')).not.toBeInTheDocument();
    });

    it('shows the duplicate-address error inline for a counsellor invite', async () => {
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'RESERVED' });
        mocks.createAccountInvite.mockRejectedValue(
            new Response(null, { status: 409, headers: { 'X-Reason': 'EMAIL_NOT_AVAILABLE' } }),
        );
        const user = await fill('900');
        const sendButton = screen.getByRole('button', { name: 'Anlegen & einladen' });
        await waitFor(() => expect(sendButton).toBeEnabled(), { timeout: 10_000 });
        await user.click(sendButton);

        expect(
            await screen.findAllByText(
                'Diese E-Mail-Adresse wird bereits für ein bestehendes Konto oder eine bestehende Einladung verwendet. Bitte eine andere Adresse verwenden.',
            ),
        ).toHaveLength(2);
        expect(screen.getByLabelText('E-Mail')).toHaveValue('lisa.simpson@example.org');
        expect(screen.getByRole('button', { name: 'Vorname bearbeiten: Lisa' })).toBeInTheDocument();
    });

    it('does not pin the platform admin to "Träger 0"', async () => {
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: '0' });
        render(<CounsellorInvitesTab />);

        const tenant = await screen.findByRole('combobox', { name: 'Träger' });
        expect(tenant).toHaveValue('');
    });

    it('lists every invite that joins a unit, but not the Träger founders', async () => {
        const counsellorRow = { ...invite(1, 79, 'EMAIL_SENT'), targetRole: 'COUNSELLOR' };
        const agencyAdminRow = { ...invite(2, 79, 'DRAFT'), targetRole: 'AGENCY_ADMIN' };
        const joinsTenant = { ...invite(3, 79, 'EMAIL_SENT'), tenantIdAllocationMode: 'EXISTING' };
        const foundsTenant = { ...invite(4, 79, 'EMAIL_SENT'), tenantIdAllocationMode: null };
        mocks.listAccountInvites.mockResolvedValue(
            invitesPage([counsellorRow, agencyAdminRow, joinsTenant, foundsTenant]),
        );

        render(<CounsellorInvitesTab />);

        expect(await screen.findByText('taken1@example.org')).toBeInTheDocument();
        expect(screen.getByText('taken2@example.org')).toBeInTheDocument();
        expect(screen.getByText('taken3@example.org')).toBeInTheDocument();
        expect(screen.queryByText('taken4@example.org')).not.toBeInTheDocument();
        expect(mocks.listAccountInvites.mock.calls[0][0].targetRole).toBeUndefined();
    });

    it('changes a counsellor’s topic permission from the table', async () => {
        const counsellorRow = {
            ...invite(1, 79, 'ACCEPTED'),
            targetRole: 'COUNSELLOR',
            acceptedAt: '2026-08-02T10:00:00Z',
            topicPermission: 'NONE',
        };
        mocks.listAccountInvites.mockResolvedValue(invitesPage([counsellorRow]));
        mocks.updateAccountInviteTopicPermission.mockResolvedValue({ ...counsellorRow, topicPermission: 'CREATE' });
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        await user.click(await screen.findByRole('button', { name: /Themen für/ }));
        await user.click(within(await screen.findByRole('menu')).getByText('Darf weitere Themen anlegen'));

        await waitFor(() => expect(mocks.updateAccountInviteTopicPermission).toHaveBeenCalledWith(1, 'CREATE'));
        expect(await screen.findByText('Themen-Berechtigung gespeichert')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Themen für/ })).toHaveTextContent('Themen: Anlegen');
    });

    it('shows the new topic level at once and puts the old one back when the save fails', async () => {
        const counsellorRow = {
            ...invite(1, 79, 'ACCEPTED'),
            targetRole: 'COUNSELLOR',
            acceptedAt: '2026-08-02T10:00:00Z',
            topicPermission: 'NONE',
        };
        mocks.listAccountInvites.mockResolvedValue(invitesPage([counsellorRow]));
        let reject: (reason: unknown) => void = () => {};
        mocks.updateAccountInviteTopicPermission.mockReturnValue(
            new Promise((_, rejectSave) => {
                reject = rejectSave;
            }),
        );
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        const chip = await screen.findByRole('button', { name: /Themen für/ });
        await user.click(chip);
        await user.click(within(await screen.findByRole('menu')).getByText('Darf weitere Themen anlegen'));

        await waitFor(() => expect(chip).toHaveTextContent('Themen: Anlegen'));
        reject(new Error('network'));
        await waitFor(() => expect(chip).toHaveTextContent('Themen: Keine weiteren'));
        expect(await screen.findByText('Die Themen-Berechtigung konnte nicht geändert werden.')).toBeInTheDocument();
    });

    describe('role chip (ORISO-UserService#1260)', () => {
        const sentRow = {
            ...invite(5, 79, 'EMAIL_SENT'),
            targetRole: 'COUNSELLOR',
            firstName: 'Lena',
            lastName: 'Vogt',
            emailDeliveryStatus: 'SENT',
            progressPhase: 'INVITED',
        };
        const acceptedRow = {
            ...invite(6, 79, 'ACCEPTED'),
            targetRole: 'COUNSELLOR',
            firstName: 'Anke',
            lastName: 'Roth',
            agencyId: 12,
            acceptedAt: '2026-08-02T10:00:00Z',
            provisionedUserId: 'c-6',
            progressPhase: 'ACCOUNT_CREATED',
        };

        beforeEach(() => {
            mocks.superAdmin = true;
        });

        it('changes the role of a sent invite and offers to resend the mail that names the old role', async () => {
            mocks.listAccountInvites.mockResolvedValue(invitesPage([sentRow]));
            mocks.changeAccountInviteRole.mockResolvedValue({ ...sentRow, targetRole: 'AGENCY_ADMIN' });
            mocks.resendAccountInvite.mockResolvedValue({ ...sentRow, id: 50 });
            render(<CounsellorInvitesTab />);
            const user = userEvent.setup();

            await user.click(await screen.findByRole('button', { name: /^Rolle von Lena Vogt/ }));
            await user.click(within(await screen.findByRole('menu')).getByText('BST-Admin'));

            await waitFor(() =>
                expect(mocks.changeAccountInviteRole).toHaveBeenCalledWith(5, { targetRole: 'AGENCY_ADMIN' }),
            );
            expect(
                await screen.findByText('Rolle geändert. Die Einladungs-Mail nennt noch die alte Rolle.'),
            ).toBeInTheDocument();
            // No automatic resend: only the snackbar action sends the mail again.
            expect(mocks.resendAccountInvite).not.toHaveBeenCalled();
            await user.click(screen.getByRole('button', { name: 'Erneut senden' }));
            await waitFor(() => expect(mocks.resendAccountInvite).toHaveBeenCalledWith(5, expect.anything()));
        });

        it('adds "auch BST-Admin" to an accepted counsellor in the agency of the invite', async () => {
            mocks.listAccountInvites.mockResolvedValue(invitesPage([acceptedRow]));
            mocks.addConsultantRole.mockResolvedValue({ consultantId: 'c-6', role: 'AGENCY_ADMIN', agencyIds: [12] });
            render(<CounsellorInvitesTab />);
            const user = userEvent.setup();

            await user.click(await screen.findByRole('button', { name: /^Rolle von Anke Roth/ }));
            await user.click(within(await screen.findByRole('menu')).getByText('+ auch BST-Admin'));

            await waitFor(() =>
                expect(mocks.addConsultantRole).toHaveBeenCalledWith('c-6', { role: 'AGENCY_ADMIN', agencyId: 12 }),
            );
            expect(await screen.findByText('„auch BST-Admin“ hinzugefügt.')).toBeInTheDocument();
            await waitFor(() =>
                expect(screen.getByRole('button', { name: /^Rolle von Anke Roth/ })).toHaveTextContent(
                    'Berater:in + BST-Admin',
                ),
            );
        });

        it('shows "+ BST-Admin" after a reload, read from the account roles the list carries', async () => {
            mocks.listAccountInvites.mockResolvedValue(
                invitesPage([{ ...acceptedRow, accountRoles: ['COUNSELLOR', 'AGENCY_ADMIN'] }]),
            );
            render(<CounsellorInvitesTab />);

            expect(await screen.findByRole('button', { name: /^Rolle von Anke Roth/ })).toHaveTextContent(
                'Berater:in + BST-Admin',
            );
        });

        it("asks for its own tab and counts the tiles from the server's totals over every page", async () => {
            mocks.listAccountInvites.mockResolvedValue({
                ...invitesPage([sentRow]),
                totalElements: 27,
                phaseCounts: { PREPARED: 24, INVITED: 1, ACCOUNT_CREATED: 0, DONE: 0, NEEDS_ACTION: 1, CLOSED: 1 },
                phaseDetailCounts: {
                    PREPARED: { DRAFT: 24 },
                    INVITED: { EMAIL_SENT: 1 },
                    NEEDS_ACTION: { EXPIRED: 1 },
                    CLOSED: { SUPERSEDED: 1 },
                },
            });
            render(<CounsellorInvitesTab />);

            expect(await screen.findByRole('button', { name: /^24 Vorbereitet/ })).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: /^2 Braucht Aktion 1 Abgelaufen · 1 Ersetzt/ }),
            ).toBeInTheDocument();
            expect(mocks.listAccountInvites).toHaveBeenCalledWith(expect.objectContaining({ tab: 'UNIT' }));
        });

        it('explains a refused role change in German', async () => {
            mocks.listAccountInvites.mockResolvedValue(invitesPage([sentRow]));
            mocks.changeAccountInviteRole.mockRejectedValue(
                new Response(null, { status: 409, headers: { 'X-Reason': 'ONLY_UNIT_ADMIN' } }),
            );
            render(<CounsellorInvitesTab />);
            const user = userEvent.setup();

            await user.click(await screen.findByRole('button', { name: /^Rolle von Lena Vogt/ }));
            await user.click(within(await screen.findByRole('menu')).getByText('BST-Admin'));

            expect(await screen.findByText(/einzige BST-Admin-Einladung/)).toBeInTheDocument();
        });
    });
});

/*
 * The CSV's 4th column addresses whichever id space the tab owns: the Träger-ID on
 * the Träger tab, the Beratungsstellen-ID everywhere else. Agency ids only exist as
 * a reservation (AgencyService FREE/RESERVED/ASSIGNED, TEN-INV-U2), so an explicit
 * id is pinned MANUAL — 409 when it is taken — and an empty cell asks for AUTO.
 */
describe('CSV import payload per tab', () => {
    const importCsv = async (user: ReturnType<typeof userEvent.setup>, content: string) => {
        // In direct send mode the composer refuses a CSV while no template is
        // selected (`links.accountInvites.templateRequired`) and never reports the
        // parse result, so the preview modal never opens. Waiting for the fetch
        // call alone is not enough — wait for the auto-selected template to reach
        // the pill, otherwise the upload races the selection (green locally, red
        // on a loaded runner).
        // findBy's 1s default is the tight budget here: a loaded runner needs
        // longer for the fetch, the menu and the file read than a warm laptop.
        const slow = { timeout: 10_000 };
        await screen.findByRole('button', { name: /Standard/ }, slow);
        await user.click(await screen.findByRole('button', { name: 'Weitere Aktionen' }, slow));
        // The hidden file input sits inside the lazily rendered more-menu. It has
        // no accessible name (antd hides it from the a11y tree), so it cannot be
        // reached by role or label — but a bare cast would hand `user.upload` a
        // silent null the day the menu changes, so assert it is really mounted.
        await screen.findByText('CSV-Datei importieren', undefined, slow);
        const fileInput = await waitFor(() => {
            const input = document.querySelector<HTMLInputElement>('input[type="file"][accept=".csv,text/csv"]');
            expect(input).not.toBeNull();
            return input as HTMLInputElement;
        }, slow);
        await user.upload(fileInput, new File([content], 'invites.csv', { type: 'text/csv' }));
        // The file is read asynchronously (File.text / FileReader) and parsed
        // before the preview modal mounts.
        await screen.findByRole('dialog', undefined, slow);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: 7 });
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/account-invite');
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.createAccountInvite.mockResolvedValue(invite(1, 7, 'EMAIL_SENT'));
    });

    it('sends each row on its own, with the own Träger as EXISTING and the row role, BST-Admin rows before counsellor rows', async () => {
        mocks.listInviteEmailTemplates.mockResolvedValue([{ ...TEMPLATE, kind: 'COUNSELLOR_INVITE' }]);
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        await waitFor(() => expect(mocks.listInviteEmailTemplates).toHaveBeenCalled());
        // Counsellor row first in the file: the BST-Admin row must still be sent first.
        await importCsv(
            user,
            'E-Mail;Vorname;Name;Beratungsstellen-ID;Ziel;Rolle;Vorlage;Themen & Fachbereiche;Berät auch\r\n' +
                'pinned@example.org;Anna;Beispiel;42;neu;Berater:in;;true;\r\n' +
                'auto@example.org;Bernd;Muster;;neu;BST-Admin;;;nein\r\n',
        );

        await user.click(await screen.findByRole('button', { name: '2 Empfänger anlegen' }));
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(2));

        // Admin rows go first, so a counsellor row for a new unit can wait for its admin.
        const [adminCall, counsellorCall] = mocks.createAccountInvite.mock.calls.map(([body]) => body);
        expect(counsellorCall).toMatchObject({
            targetRole: 'COUNSELLOR',
            recipientEmail: 'pinned@example.org',
            tenantId: 7,
            tenantIdAllocationMode: 'EXISTING',
            agencyId: 42,
            agencyIdAllocationMode: 'MANUAL',
            topicPermission: 'CREATE',
        });
        expect(adminCall).toMatchObject({
            targetRole: 'AGENCY_ADMIN',
            recipientEmail: 'auto@example.org',
            tenantId: 7,
            agencyIdAllocationMode: 'AUTO',
            alsoCounsellor: false,
        });
        expect(adminCall.agencyId).toBeUndefined();
        expect(counsellorCall).not.toHaveProperty('importBatchId');
    });

    it('keeps the Träger id column a tenant id, without touching the agency space', async () => {
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        renderTenantTab();
        const user = userEvent.setup();

        await waitFor(() => expect(mocks.listInviteEmailTemplates).toHaveBeenCalled());
        await importCsv(user, 'E-Mail;Vorname;Name;Träger-ID\r\ntenant@example.org;Anna;Beispiel;42\r\n');

        await user.click(await screen.findByRole('button', { name: '1 Empfänger anlegen' }));
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));

        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            targetRole: 'TENANT_ADMIN',
            recipientEmail: 'tenant@example.org',
            tenantId: 42,
        });
        expect(mocks.createAccountInvite.mock.calls[0][0].agencyId).toBeUndefined();
        expect(mocks.createAccountInvite.mock.calls[0][0].agencyIdAllocationMode).toBeUndefined();
    });
});

describe('CSV entries in the more-menu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: 7 });
        mocks.listInviteEmailTemplates.mockResolvedValue([{ ...TEMPLATE, kind: 'COUNSELLOR_INVITE' }]);
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
    });

    const openMenu = async () => {
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();
        await screen.findByRole('button', { name: /Standard/ }, { timeout: 10_000 });
        await user.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));
        return user;
    };

    it('lists the same nine columns in the menu hint as in the downloaded template', async () => {
        const blobs: Blob[] = [];
        const createObjectURL = vi.fn((blob: Blob) => {
            blobs.push(blob);
            return 'blob:template';
        });
        Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
        const user = await openMenu();

        const entry = (await screen.findByText('CSV-Datei importieren')).closest('[role="menuitem"]') as HTMLElement;
        expect(entry).toHaveTextContent('Berät auch');
        await user.click(screen.getByText('CSV-Vorlage herunterladen'));

        const text = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsText(blobs[0]);
        });
        const header = text
            .replace(/^\ufeff/, '')
            .split('\r\n')[0]
            .split(';');
        expect(header).toHaveLength(9);
        expect(header[8]).toBe('Berät auch');
    });

    it('opens the file picker when the menu item itself is activated, as the keyboard does', async () => {
        const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
        await openMenu();

        const entry = (await screen.findByText('CSV-Datei importieren')).closest('[role="menuitem"]') as HTMLElement;
        fireEvent.click(entry);

        const picker = click.mock.contexts.find((input) => (input as HTMLInputElement).type === 'file');
        expect(picker).toHaveAttribute('accept', '.csv,text/csv');
        click.mockRestore();
    });
});
