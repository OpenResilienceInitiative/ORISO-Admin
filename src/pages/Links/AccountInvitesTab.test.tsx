import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    searchTenantData: vi.fn(),
    getAgencyDataById: vi.fn(),
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
    // E2: the editor's preview is rendered by the backend. Without this the real
    // fetch would run under jsdom — which is a load-dependent hang, not an
    // honest failure. (Same omission #751 had; see the preview mock there.)
    previewInviteEmailTemplateContent: mocks.previewInviteEmailTemplateContent,
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

const renderTenantTab = async () => {
    const { TenantInvitesTab } = await import('./AccountInvitesTab');
    return render(<TenantInvitesTab />);
};

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

        await renderTenantTab();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = screen.getByRole('button', { name: 'Direkt Versenden' });
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

        await renderTenantTab();

        const field = await screen.findByLabelText('Träger-ID');
        await waitFor(() => expect(field).toHaveValue('Auto'));
        expect(screen.getByText('Die nächste freie ID wird automatisch vergeben.')).toBeInTheDocument();
    });

    it('shows the dedicated collision message when the backend answers 409', async () => {
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.createAccountInvite.mockRejectedValue(new Response(null, { status: 409 }));

        await renderTenantTab();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        // Single active template is auto-selected by the tab; only e-mail is required on top.
        expect(await screen.findByRole('button', { name: /Standard/ })).toBeInTheDocument();
        const sendButton = screen.getByRole('button', { name: 'Direkt Versenden' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() =>
            expect(mocks.createAccountInvite).toHaveBeenCalledWith(
                expect.objectContaining({ targetRole: 'TENANT_ADMIN', recipientEmail: 'neu@example.org' }),
            ),
        );
        expect(await screen.findByText('This tenant ID is already taken.')).toBeInTheDocument();
    });

    it('does not auto-fill the Träger-ID on the counsellor tab', async () => {
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        const { CounsellorInvitesTab } = await import('./AccountInvitesTab');
        render(<CounsellorInvitesTab />);

        const field = await screen.findByLabelText('Träger-ID');
        await waitFor(() => expect(mocks.listInviteEmailTemplates).toHaveBeenCalled());
        expect(field).toHaveValue('');
        expect(mocks.searchTenantData).not.toHaveBeenCalled();
    });
});

/*
 * Department routing on counsellor invites (#384): when the pinned
 * Beratungsstellen-ID resolves to an EXISTING agency, the invite adopts the
 * agency's single canonical topic as the department — after checking tenant
 * scope. A fresh reservation (the id resolves to nothing, TEN-INV-U2) carries
 * no department; provisioning assigns routing when the agency is created.
 * Every refusal must surface as a visible toast, not just a rejected promise.
 */
describe('CounsellorInvitesTab department routing (#384)', () => {
    const agencyPayload = (topics: { id: unknown; name: string }[], tenantId: number | string = 79) => ({
        _embedded: {
            id: '275',
            tenantId,
            topics,
        },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: 79 });
        mocks.acceptBaseUrlForRole.mockReturnValue('https://admin.example/account-invite');
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.listInviteEmailTemplates.mockResolvedValue([{ ...TEMPLATE, kind: 'COUNSELLOR_INVITE' }]);
        mocks.createAccountInvite.mockResolvedValue(invite(99, 79, 'EMAIL_SENT'));
        // The manual Beratungsstellen-ID only becomes submittable once the U2
        // availability check confirms it (canSubmit gates the send button).
        mocks.checkAgencyIdAvailability.mockResolvedValue({ state: 'FREE' });
    });

    /** Fill the composer for a complete counsellor invite and press send. */
    const fillAndSend = async () => {
        const { CounsellorInvitesTab } = await import('./AccountInvitesTab');
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'lisa.simpson@oriso.org');
        await user.type(screen.getByLabelText('Vorname'), 'Lisa');
        await user.type(screen.getByLabelText('Name'), 'Simpson');
        await user.type(screen.getByLabelText('Beratungsstellen-ID'), '275');
        const sendButton = screen.getByRole('button', { name: 'Direkt Versenden' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);
        return user;
    };

    it('routes a counsellor invite to the agency single topic', async () => {
        mocks.getAgencyDataById.mockResolvedValue(agencyPayload([{ id: 2, name: 'U25 Suizidprävention' }]));

        await fillAndSend();

        await waitFor(() =>
            expect(mocks.createAccountInvite).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetRole: 'COUNSELLOR',
                    tenantId: 79,
                    agencyId: 275,
                    agencyIdAllocationMode: 'MANUAL',
                    departmentId: 2,
                    firstName: 'Lisa',
                    lastName: 'Simpson',
                    recipientEmail: 'lisa.simpson@oriso.org',
                }),
            ),
        );
        expect(mocks.getAgencyDataById).toHaveBeenCalledWith('275');
    });

    /*
     * P3: the counsellor invite is the second invite kind and must be guarded the
     * same way as the tenant invite — inline on the e-mail field, with the rest of
     * the row (names, Beratungsstellen-ID) preserved.
     */
    it('shows the duplicate-address error inline for a counsellor invite (P3)', async () => {
        mocks.getAgencyDataById.mockResolvedValue(agencyPayload([{ id: 2, name: 'U25 Suizidprävention' }]));
        mocks.createAccountInvite.mockRejectedValue(
            new Response(null, { status: 409, headers: { 'X-Reason': 'EMAIL_NOT_AVAILABLE' } }),
        );

        await fillAndSend();

        expect(await screen.findByText('E-Mail-Adresse bereits vorhanden. Anlegen nicht möglich.')).toBeInTheDocument();
        expect(screen.queryByText('Could not create link')).not.toBeInTheDocument();
        // Nothing the admin typed is lost — only the address needs correcting.
        expect(screen.getByLabelText('E-Mail')).toHaveValue('lisa.simpson@oriso.org');
        expect(screen.getByLabelText('Vorname')).toHaveValue('Lisa');
        await waitFor(() => expect(screen.getByRole('button', { name: 'Direkt Versenden' })).toBeDisabled());
    });

    it('refuses with a visible error when the agency has no topic', async () => {
        mocks.getAgencyDataById.mockResolvedValue(agencyPayload([]));

        await fillAndSend();

        expect(
            await screen.findByText('Die Beratungsstelle hat kein Thema — die Einladung kann nicht zugeordnet werden.'),
        ).toBeInTheDocument();
        expect(mocks.createAccountInvite).not.toHaveBeenCalled();
    });

    it('refuses with a visible error when the agency has multiple topics (no picker yet)', async () => {
        mocks.getAgencyDataById.mockResolvedValue(
            agencyPayload([
                { id: 2, name: 'U25 Suizidprävention' },
                { id: 5, name: 'Angehörigenberatung' },
            ]),
        );

        await fillAndSend();

        expect(
            await screen.findByText(
                'Die Beratungsstelle hat mehrere Themen — die Einladung kann noch keinem Thema zugeordnet werden.',
            ),
        ).toBeInTheDocument();
        expect(mocks.createAccountInvite).not.toHaveBeenCalled();
    });

    it('refuses with a visible error when the agency belongs to another tenant', async () => {
        mocks.getAgencyDataById.mockResolvedValue(agencyPayload([{ id: 2, name: 'U25 Suizidprävention' }], 80));

        await fillAndSend();

        expect(
            await screen.findByText('Die Beratungsstelle gehört nicht zum Träger dieser Einladung.'),
        ).toBeInTheDocument();
        expect(mocks.createAccountInvite).not.toHaveBeenCalled();
    });

    it('refuses with a visible error when the topic id is not numeric', async () => {
        mocks.getAgencyDataById.mockResolvedValue(agencyPayload([{ id: 'not-a-number', name: 'Kaputt' }]));

        await fillAndSend();

        expect(
            await screen.findByText('Die Beratungsstelle hat kein Thema — die Einladung kann nicht zugeordnet werden.'),
        ).toBeInTheDocument();
        expect(mocks.createAccountInvite).not.toHaveBeenCalled();
    });

    it('keeps the reservation flow working: a free id resolves to no agency and submits without a department', async () => {
        const { AgencyAccessError } = await import('../../api/agency/getAgencyById');
        mocks.getAgencyDataById.mockRejectedValue(new AgencyAccessError());

        await fillAndSend();

        await waitFor(() =>
            expect(mocks.createAccountInvite).toHaveBeenCalledWith(
                expect.objectContaining({
                    targetRole: 'COUNSELLOR',
                    tenantId: 79,
                    agencyId: 275,
                    agencyIdAllocationMode: 'MANUAL',
                }),
            ),
        );
        expect(mocks.createAccountInvite.mock.calls[0][0].departmentId).toBeUndefined();
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
            const input = document.querySelector<HTMLInputElement>('.ant-upload input[type="file"]');
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

    it('sends the counsellor id column as a pinned agency reservation, auto for empty cells', async () => {
        mocks.listInviteEmailTemplates.mockResolvedValue([{ ...TEMPLATE, kind: 'COUNSELLOR_INVITE' }]);
        const { CounsellorInvitesTab } = await import('./AccountInvitesTab');
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        await waitFor(() => expect(mocks.listInviteEmailTemplates).toHaveBeenCalled());
        await importCsv(
            user,
            'E-Mail;Vorname;Name;Beratungsstellen-ID\r\npinned@example.org;Anna;Beispiel;42\r\nauto@example.org;Bernd;Muster;\r\n',
        );

        await user.click(await screen.findByRole('button', { name: '2 Empfänger anlegen' }));
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(2));

        // The admin's own tenant scopes both rows; the file only says which agency.
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            targetRole: 'COUNSELLOR',
            recipientEmail: 'pinned@example.org',
            tenantId: 7,
            agencyId: 42,
            agencyIdAllocationMode: 'MANUAL',
        });
        expect(mocks.createAccountInvite.mock.calls[1][0]).toMatchObject({
            recipientEmail: 'auto@example.org',
            tenantId: 7,
            agencyIdAllocationMode: 'AUTO',
        });
        expect(mocks.createAccountInvite.mock.calls[1][0].agencyId).toBeUndefined();
        // A tenant allocation mode on a non-Träger invite is a 400 (UserService).
        expect(mocks.createAccountInvite.mock.calls[0][0].tenantIdAllocationMode).toBeUndefined();
    });

    it('keeps the Träger id column a tenant id, without touching the agency space', async () => {
        mocks.listInviteEmailTemplates.mockResolvedValue([TEMPLATE]);
        await renderTenantTab();
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
