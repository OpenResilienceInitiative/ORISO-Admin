import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    listAccountInvites: vi.fn(),
    createAccountInvite: vi.fn(),
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

const renderCounsellorTab = async () => {
    const { CounsellorInvitesTab } = await import('./AccountInvitesTab');
    return render(<CounsellorInvitesTab />);
};

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
        await renderCounsellorTab();

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
        await renderCounsellorTab();

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
            await renderCounsellorTab();
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
            await renderCounsellorTab();
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

    it('bulk send resends only the selected rows with the chosen template and clears the selection', async () => {
        mocks.resendAccountInvite.mockImplementation((id: number) => Promise.resolve(invite(id, 'EMAIL_SENT')));
        await renderCounsellorTab();
        const user = userEvent.setup();

        await user.click(await rowCheckbox('person21@example.org'));

        const sendButton = await screen.findByRole('button', { name: '1 ausgewählte senden' });
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.resendAccountInvite).toHaveBeenCalledTimes(1));
        expect(mocks.resendAccountInvite).toHaveBeenCalledWith(21, {
            acceptBaseUrl: 'https://admin.example/account-invite',
            templateId: 7,
        });
        expect(mocks.createAccountInvite).not.toHaveBeenCalled();
        expect(await screen.findByText('1 Einladungen gesendet')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText('1 ausgewählt')).not.toBeInTheDocument());
        // Back in single-create mode once nothing is selected.
        expect(await screen.findByRole('button', { name: 'Direkt Versenden' })).toBeInTheDocument();
    });
});
