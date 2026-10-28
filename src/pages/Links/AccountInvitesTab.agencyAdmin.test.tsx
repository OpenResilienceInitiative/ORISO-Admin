import { appendFileSync } from 'node:fs';
import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vite-plus/test';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Static import on purpose — see the note in AccountInvitesTab.test.tsx.
import { CounsellorInvitesTab } from './AccountInvitesTab';
import { UserRole } from '../../enums/UserRole';

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
    searchTenantData: vi.fn(),
    getAgencyDataById: vi.fn(),
    parseUserAuthInfo: vi.fn(),
    acceptBaseUrlForRole: vi.fn(),
    checkTenantIdAvailability: vi.fn(),
    nextFreeTenantId: vi.fn(),
    checkAgencyIdAvailability: vi.fn(),
    nextFreeAgencyId: vi.fn(),
    useUserRoles: vi.fn(),
    searchInviteAgencies: vi.fn(),
    findInviteTenant: vi.fn(),
}));

vi.mock('../../hooks/useUserRoles.hook', () => ({ useUserRoles: mocks.useUserRoles }));

vi.mock('../../api/agency/searchInviteAgencies', () => ({
    searchInviteAgencies: mocks.searchInviteAgencies,
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
    // The real preview fetch hangs under jsdom instead of failing.
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

vi.mock('../../api/tenant/findInviteTenant', () => ({ findInviteTenant: mocks.findInviteTenant }));

vi.mock('../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: mocks.parseUserAuthInfo,
}));

// Tests that type a manual id need the availability check to answer.
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

const agencyAdminRoles = (...roles: UserRole[]) => ({
    roles,
    hasRole: (wanted: UserRole | UserRole[]) =>
        (Array.isArray(wanted) ? wanted : [wanted]).some((role) => roles.includes(role)),
    isSuperAdmin: false,
    isTechnicalAccount: false,
    isTenantScopedAdmin: false,
    tenantId: 40,
    tokenUnreadable: false,
});

// The tab loads templates, invites and the own agencies in parallel; a loaded runner needs more than 1s.
const SLOW = { timeout: 10_000 };

const OWN_AGENCY = {
    id: 101,
    name: 'Caritas Suchtberatung Freiburg',
    tenantId: 40,
    tenantName: 'Caritas Freiburg',
    topics: ['Sucht'],
};
const SECOND_AGENCY = {
    id: 102,
    name: 'Caritas Schuldnerberatung Freiburg',
    tenantId: 40,
    tenantName: 'Caritas Freiburg',
    topics: ['Schulden'],
};

/** The picker's search answers in pages (AgencyService `total`, 10 per page). */
const agencyPage = (hits: Array<Record<string, unknown>>, total = hits.length, hasMore = false) => ({
    hits,
    total,
    hasMore,
});

const createInviteTrace = (caseName: string) => {
    const started = performance.now();
    const trace = (phase: string, details: Record<string, unknown> = {}) => {
        const destination = process.env.ACCOUNT_INVITE_TRACE_FILE;
        if (!destination) return;
        appendFileSync(
            destination,
            `${JSON.stringify({
                caseName,
                file: 'src/pages/Links/AccountInvitesTab.agencyAdmin.test.tsx',
                pid: process.pid,
                traceId: `${process.pid}:${performance.timeOrigin}:${started}`,
                phase,
                atUTC: new Date().toISOString(),
                elapsedMs: performance.now() - started,
                inputs: [...document.querySelectorAll<HTMLInputElement>('input[role="combobox"]')].map((input) => ({
                    id: input.id,
                    value: input.value,
                    focused: document.activeElement === input,
                    expanded: input.getAttribute('aria-expanded'),
                    controls: input.getAttribute('aria-controls'),
                    disabled: input.disabled,
                })),
                options: [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((option) => ({
                    text: option.textContent,
                    selected: option.getAttribute('aria-selected'),
                    hidden: option.hidden,
                    ariaHidden: option.getAttribute('aria-hidden'),
                })),
                listboxes: [...document.querySelectorAll<HTMLElement>('[role="listbox"]')].map((list) => ({
                    id: list.id,
                    text: list.textContent,
                    hidden: list.hidden,
                })),
                topicControls: [...document.querySelectorAll('button')]
                    .map((button) => button.textContent)
                    .filter((text) => text?.startsWith('Themen & Fachbereiche')),
                searchArgs: mocks.searchInviteAgencies.mock.calls,
                agencyDefaultArgs: mocks.getAgencyDataById.mock.calls,
                ...details,
            })}\n`,
        );
    };
    // The native finish hook also runs after an assertion failure or timeout.
    if (process.env.ACCOUNT_INVITE_TRACE_FILE) onTestFinished(() => trace('test:finished'));
    return trace;
};

describe.each([
    ['agency admin', UserRole.AgencyAdmin],
    ['restricted agency admin', UserRole.RestrictedAgencyAdmin],
])('CounsellorInvitesTab for a %s', (_label, agencyRole) => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.useUserRoles.mockReturnValue(agencyAdminRoles(agencyRole, UserRole.UserAdmin));
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: '40' });
        mocks.acceptBaseUrlForRole.mockReturnValue('https://app.example/account-invite');
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.listInviteEmailTemplates.mockResolvedValue([{ ...TEMPLATE, kind: 'COUNSELLOR_INVITE' }]);
        mocks.createAccountInvite.mockResolvedValue({ ...invite(99, 40, 'EMAIL_SENT'), targetRole: 'COUNSELLOR' });
        mocks.searchInviteAgencies.mockResolvedValue(agencyPage([OWN_AGENCY]));
    });

    it('fixes the role on Berater:in and locks Träger and Beratungsstelle to the own unit', async () => {
        render(<CounsellorInvitesTab />);

        const agency = await screen.findByRole('combobox', { name: 'Beratungsstelle' });
        await waitFor(() => expect(agency).toHaveValue('Nr. 101'), SLOW);
        expect(agency).toBeDisabled();
        const tenant = screen.getByRole('combobox', { name: 'Träger' });
        expect(tenant).toBeDisabled();
        expect(tenant).toHaveValue('Nr. 40');
        expect(screen.getByText('Caritas Freiburg')).toBeInTheDocument();
        expect(mocks.findInviteTenant).not.toHaveBeenCalled();
        expect(screen.getByText('Caritas Suchtberatung Freiburg')).toBeInTheDocument();
        // One role on offer: the card shows it as a disabled value pill, not a dead select.
        expect(screen.getByRole('button', { name: 'Rolle bearbeiten: Berater:in' })).toBeDisabled();
        expect(screen.queryByRole('combobox', { name: 'Rolle' })).not.toBeInTheDocument();
    });

    it('sends a counsellor invite into the own agency as EXISTING', async () => {
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();
        await waitFor(
            () => expect(screen.getByRole('combobox', { name: 'Beratungsstelle' })).toHaveValue('Nr. 101'),
            SLOW,
        );
        await user.type(await screen.findByLabelText('E-Mail'), 'lisa.simpson@example.org');
        await user.type(screen.getByLabelText('Vorname'), 'Lisa');
        await user.type(screen.getByLabelText('Name'), 'Simpson');
        const send = screen.getByRole('button', { name: 'Einladen' });
        await waitFor(() => expect(send).toBeEnabled());
        await user.click(send);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            targetRole: 'COUNSELLOR',
            agencyId: 101,
            agencyIdAllocationMode: 'EXISTING',
            recipientEmail: 'lisa.simpson@example.org',
        });
        expect(mocks.createAccountInvite.mock.calls[0][0].alsoCounsellor).toBeUndefined();
    });

    it('shows the CSV import disabled, with the reason', async () => {
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();
        await screen.findByRole('button', { name: /Standard/ }, { timeout: 10_000 });
        await user.click(screen.getByRole('button', { name: 'Weitere Aktionen' }));
        const entry = (await screen.findByText('CSV-Datei importieren')).closest('[role="menuitem"]');
        expect(entry).toHaveAttribute('aria-disabled', 'true');
        expect(
            screen.getByText(
                'Nur Plattform- und Träger-Admins: Eine Datei kann Rollen und neue Beratungsstellen enthalten.',
            ),
        ).toBeInTheDocument();
    });

    it('lists only counsellor invites', async () => {
        const counsellorRow = { ...invite(1, 40, 'EMAIL_SENT'), targetRole: 'COUNSELLOR', agencyId: 101 };
        const agencyAdminRow = { ...invite(2, 40, 'DRAFT'), targetRole: 'AGENCY_ADMIN', agencyId: 101 };
        const joinsTenant = { ...invite(3, 40, 'EMAIL_SENT'), tenantIdAllocationMode: 'EXISTING' };
        mocks.listAccountInvites.mockResolvedValue(invitesPage([counsellorRow, agencyAdminRow, joinsTenant]));

        render(<CounsellorInvitesTab />);

        expect(await screen.findByText('taken1@example.org')).toBeInTheDocument();
        expect(screen.queryByText('taken2@example.org')).not.toBeInTheDocument();
        expect(screen.queryByText('taken3@example.org')).not.toBeInTheDocument();
    });

    it('with several own agencies: picks only among them, no new agency, no number stepping', async () => {
        const trace = createInviteTrace(`${_label}: several own agencies`);
        trace('test:start');
        mocks.searchInviteAgencies.mockResolvedValue(agencyPage([OWN_AGENCY, SECOND_AGENCY]));
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        trace('findAgency:before');
        const agency = await screen.findByRole('combobox', { name: 'Beratungsstelle' });
        trace('findAgency:after');
        trace('searchReady:before');
        await waitFor(() => expect(mocks.searchInviteAgencies).toHaveBeenCalled());
        trace('searchReady:after');
        expect(agency).toBeEnabled();
        expect(agency).toHaveValue('');
        await user.type(await screen.findByLabelText('E-Mail'), 'lisa.simpson@example.org');
        await user.type(screen.getByLabelText('Vorname'), 'Lisa');
        await user.type(screen.getByLabelText('Name'), 'Simpson');
        expect(screen.getByRole('button', { name: 'Einladen' })).toBeDisabled();
        expect(await screen.findByText('Bitte eine Ihrer Beratungsstellen wählen.')).toBeInTheDocument();
        // Neither the next-free-number stepping nor the "Stattdessen als BST-Admin" founding path.
        expect(screen.queryByText('Stattdessen als BST-Admin einladen')).not.toBeInTheDocument();

        trace('openAgency:before');
        await user.click(agency);
        trace('openAgency:after');
        expect(await screen.findByRole('option', { name: /Caritas Schuldnerberatung Freiburg/ })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Neu anlegen/ })).not.toBeInTheDocument();
        // A typed number of a foreign agency is not taken over (the backend would answer 403).
        trace('type999:before');
        await user.type(agency, '999');
        trace('type999:after');
        expect(screen.queryByRole('option', { name: /999/ })).not.toBeInTheDocument();
        trace('clearAgency:before');
        await user.clear(agency);
        trace('clearAgency:after');
        trace('findOwnOptionAfterClear:before');
        const ownOption = await screen.findByRole('option', { name: /Caritas Schuldnerberatung Freiburg/ });
        trace('findOwnOptionAfterClear:after');
        await user.click(ownOption);
        trace('clickOwnOption:after');

        const send = screen.getByRole('button', { name: 'Einladen' });
        await waitFor(() => expect(send).toBeEnabled());
        await user.click(send);
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            targetRole: 'COUNSELLOR',
            agencyId: 102,
            agencyIdAllocationMode: 'EXISTING',
        });
        expect(mocks.nextFreeAgencyId).not.toHaveBeenCalled();
        trace('test:done');
    });

    it('with more than 10 own agencies: the 11th and 12th are reachable via "Weitere anzeigen"', async () => {
        const own = Array.from({ length: 12 }, (_, index) => ({
            id: 201 + index,
            name: `Caritas Beratungsstelle ${String(index + 1).padStart(2, '0')}`,
            tenantId: 40,
            tenantName: 'Caritas Freiburg',
            topics: ['Sucht'],
        }));
        mocks.searchInviteAgencies.mockImplementation(async (_query: string, _tenantId?: number, page = 1) =>
            agencyPage(own.slice((page - 1) * 10, page * 10), own.length, page * 10 < own.length),
        );
        render(<CounsellorInvitesTab />);
        const user = userEvent.setup();

        const agency = await screen.findByRole('combobox', { name: 'Beratungsstelle' });
        await waitFor(() => expect(agency).toBeEnabled(), SLOW);
        await user.click(agency);
        await screen.findByRole('option', { name: /Caritas Beratungsstelle 10/ }, SLOW);
        expect(screen.queryByRole('option', { name: /Caritas Beratungsstelle 12/ })).not.toBeInTheDocument();

        await user.click(screen.getByRole('option', { name: 'Weitere anzeigen (10 von 12)' }));
        await user.click(await screen.findByRole('option', { name: /Caritas Beratungsstelle 12/ }, SLOW));

        await user.type(await screen.findByLabelText('E-Mail'), 'lisa.simpson@oriso.org');
        await user.type(screen.getByLabelText('Vorname'), 'Lisa');
        await user.type(screen.getByLabelText('Name'), 'Simpson');
        const send = screen.getByRole('button', { name: 'Einladen' });
        await waitFor(() => expect(send).toBeEnabled());
        await user.click(send);
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            agencyId: 212,
            agencyIdAllocationMode: 'EXISTING',
        });
    });
});

describe('CounsellorInvitesTab — platform admin picks an existing agency first', () => {
    const FOREIGN_AGENCY = {
        id: 14,
        name: 'Mail v2 Einzeltest',
        tenantId: 7,
        tenantName: 'Caritas Südbaden',
        topics: ['Sucht'],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
        mocks.useUserRoles.mockReturnValue({
            ...agencyAdminRoles(UserRole.TenantAdmin, UserRole.AgencyAdmin),
            isSuperAdmin: true,
            tenantId: 0,
        });
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: '0' });
        mocks.acceptBaseUrlForRole.mockReturnValue('https://app.example/account-invite');
        mocks.listAccountInvites.mockResolvedValue(invitesPage([]));
        mocks.listInviteEmailTemplates.mockResolvedValue([{ ...TEMPLATE, kind: 'COUNSELLOR_INVITE' }]);
        mocks.createAccountInvite.mockResolvedValue({ ...invite(99, 7, 'EMAIL_SENT'), targetRole: 'COUNSELLOR' });
        mocks.searchInviteAgencies.mockResolvedValue(agencyPage([FOREIGN_AGENCY]));
        mocks.searchTenantData.mockResolvedValue({ data: [], total: 0 });
    });

    it('fills the empty Träger from the picked agency and keeps both after "Senden & nächste"', async () => {
        const trace = createInviteTrace('platform admin: picked existing agency and next');
        trace('render:before');
        render(<CounsellorInvitesTab />);
        trace('render:after');
        const user = userEvent.setup();
        trace('email:find:before');
        const email = await screen.findByLabelText('E-Mail');
        trace('email:find:after');
        trace('email:type:before');
        await user.type(email, 'lisa.simpson@example.org');
        trace('email:type:after');
        trace('first-name:type:before');
        await user.type(screen.getByLabelText('Vorname'), 'Lisa');
        trace('first-name:type:after');
        trace('last-name:type:before');
        await user.type(screen.getByLabelText('Name'), 'Simpson');
        trace('last-name:type:after');
        expect(screen.getByRole('combobox', { name: 'Träger' })).toHaveValue('');

        const agency = screen.getByRole('combobox', { name: 'Beratungsstelle' });
        trace('agency:open:before');
        await user.click(agency);
        trace('agency:open:after');
        trace('agency:option:before');
        const option = await screen.findByRole('option', { name: /Mail v2 Einzeltest/ }, SLOW);
        trace('agency:option:after');
        trace('agency:pick:before');
        await user.click(option);
        trace('agency:pick:after');

        // The Träger follows the agency as an existing unit; the card keeps its field open.
        const tenant = screen.getByRole('combobox', { name: 'Träger' });
        trace('tenant:readback:before');
        await waitFor(() => expect(tenant).toHaveValue('Caritas Südbaden · 7'), SLOW);
        trace('tenant:readback:after');

        trace('send-menu:open:before');
        await user.click(screen.getByRole('button', { name: 'Sendeoptionen' }));
        trace('send-menu:open:after');
        trace('send-menu:option:before');
        const nextOption = await screen.findByRole('menuitem', { name: /Senden & nächste/ });
        trace('send-menu:option:after');
        trace('send-menu:pick:before');
        await user.click(nextOption);
        trace('send-menu:pick:after');
        trace('send:find:before');
        const send = await screen.findByRole('button', { name: 'Einladen & nächste' });
        trace('send:find:after');
        trace('send:enabled:before');
        await waitFor(() => expect(send).toBeEnabled(), SLOW);
        trace('send:enabled:after');
        trace('send:click:before');
        await user.click(send);
        trace('send:click:after');

        trace('send:called:before');
        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        trace('send:called:after');
        expect(mocks.createAccountInvite.mock.calls[0][0]).toMatchObject({
            agencyId: 14,
            agencyIdAllocationMode: 'EXISTING',
            tenantId: 7,
            tenantIdAllocationMode: 'EXISTING',
        });
        trace('reset:email:before');
        await waitFor(() => expect(screen.getByLabelText('E-Mail')).toHaveValue(''));
        trace('reset:email:after');
        expect(screen.getByRole('combobox', { name: 'Träger' })).toHaveValue('Caritas Südbaden · 7');
        expect(screen.getByRole('combobox', { name: 'Beratungsstelle' })).toHaveValue('Mail v2 Einzeltest · 14');
        trace('test:done');
    });
});
