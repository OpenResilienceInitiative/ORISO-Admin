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

const t = (key: string, fallback?: string) => fallback ?? key;

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

// The composer's ID fields talk to the allocation endpoints (#570); keep them
// inert here — the field behaviour has its own test files.
vi.mock('../../api/idAllocation/idAllocation', () => ({
    tenantIdAllocationClient: {
        checkIdAvailability: vi.fn(),
        nextFreeId: vi.fn(),
        reserveId: vi.fn(),
        releaseId: vi.fn(),
    },
    agencyIdAllocationClient: {
        checkIdAvailability: vi.fn(),
        nextFreeId: vi.fn(),
        reserveId: vi.fn(),
        releaseId: vi.fn(),
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
