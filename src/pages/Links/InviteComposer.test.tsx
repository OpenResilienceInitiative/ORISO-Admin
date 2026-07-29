import React from 'react';
// antd's static message API is a silent no-op under React 19 without this patch
// (the app imports it in src/index.tsx; tests asserting on message text need it too).
import '@ant-design/v5-patch-for-react-19';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import splitButtonStyles from '../../components/GlobalSearch/splitButton.module.scss';

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

// The dialog itself has its own test file; here only the opened view matters.
vi.mock('./EmailTemplatesDialog', () => ({
    EmailTemplatesDialog: ({ initialView }: { initialView?: string }) => (
        <div data-testid="templates-dialog">{initialView}</div>
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

vi.mock('../../api/idAllocation/idAllocation', () => ({
    tenantIdAllocationClient: mocks.tenantIdAllocationClient,
    agencyIdAllocationClient: mocks.agencyIdAllocationClient,
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

const renderTenantTab = async () => {
    const { TenantInvitesTab } = await import('./AccountInvitesTab');
    return render(<TenantInvitesTab />);
};

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
        mocks.tenantIdAllocationClient.reserveId.mockResolvedValue({ id: 21 });
        mocks.tenantIdAllocationClient.releaseId.mockResolvedValue(undefined);
        mocks.agencyIdAllocationClient.reserveId.mockResolvedValue({ id: 21 });
        mocks.agencyIdAllocationClient.releaseId.mockResolvedValue(undefined);
    });

    it('keeps the send action outlined + disabled until valid, then flips to primary', async () => {
        await renderTenantTab();
        const user = userEvent.setup();

        const sendButton = await findSendButton('Direkt Versenden');
        const wrapper = sendButton.closest(`.${splitButtonStyles.splitButton}`) as HTMLElement;
        // Template auto-selected and Träger-ID auto-suggested — the empty e-mail
        // alone must keep the action gated and in the outlined (non-primary) look.
        expect(await screen.findByRole('button', { name: /Standard/ })).toBeInTheDocument();
        expect(sendButton).toBeDisabled();
        expect(wrapper).not.toHaveClass(splitButtonStyles.primary);

        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');

        await waitFor(() => expect(sendButton).toBeEnabled());
        expect(wrapper).toHaveClass(splitButtonStyles.primary);
    });

    it('persists the chosen send mode per tab and swaps the main label', async () => {
        const view = await renderTenantTab();
        const user = userEvent.setup();

        await findSendButton('Direkt Versenden');
        await user.click(screen.getByRole('button', { name: 'Sendeoptionen' }));
        await user.click(await screen.findByRole('menuitem', { name: 'Empfänger nur anlegen' }));

        expect(await findSendButton('Empfänger nur anlegen')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Direkt Versenden' })).not.toBeInTheDocument();
        expect(window.localStorage.getItem(sendModeStorageKey('TENANT_ADMIN'))).toBe('createOnly');

        // Survives a full remount (page reload) via localStorage.
        view.unmount();
        await renderTenantTab();
        expect(await findSendButton('Empfänger nur anlegen')).toBeInTheDocument();
    });

    it('posts WITHOUT templateId in create-only mode', async () => {
        window.localStorage.setItem(sendModeStorageKey('TENANT_ADMIN'), 'createOnly');
        mocks.createAccountInvite.mockResolvedValue({ id: 99 });

        await renderTenantTab();
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

        await renderTenantTab();
        const user = userEvent.setup();

        const idInput = await screen.findByRole('textbox', { name: 'Träger-ID' });
        expect(idInput).toHaveValue('Auto');
        expect(screen.getByText('Die nächste freie ID wird automatisch vergeben.')).toBeInTheDocument();

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

        await renderTenantTab();
        const user = userEvent.setup();

        await user.type(await screen.findByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = await findSendButton('Direkt Versenden');
        await waitFor(() => expect(sendButton).toBeEnabled());

        await user.type(screen.getByRole('textbox', { name: 'Träger-ID' }), '30');
        expect(await screen.findByText('Diese ID ist durch eine offene Einladung reserviert.')).toBeInTheDocument();
        await waitFor(() => expect(sendButton).toBeDisabled());

        await user.click(screen.getByRole('button', { name: 'Auto – Automatische ID-Vergabe' }));
        expect(screen.getByRole('textbox', { name: 'Träger-ID' })).toHaveValue('Auto');
        await waitFor(() => expect(sendButton).toBeEnabled());
    });

    it('adopts the current next free id on the first arrow click and posts MANUAL (#570)', async () => {
        mocks.createAccountInvite.mockResolvedValue({ id: 99 });

        await renderTenantTab();
        const user = userEvent.setup();

        await screen.findByRole('textbox', { name: 'Träger-ID' });
        await user.click(screen.getByRole('button', { name: 'Wert erhöhen' }));

        await waitFor(() => expect(screen.getByRole('textbox', { name: 'Träger-ID' })).toHaveValue('21'));
        expect(mocks.tenantIdAllocationClient.nextFreeId).toHaveBeenCalledWith({ direction: 'up' });
        // The tab-level `t` mock does not interpolate — the raw fallback is fine here.
        expect(await screen.findByText('ID {{id}} ist frei.')).toBeInTheDocument();

        await user.type(screen.getByLabelText('E-Mail'), 'neu@example.org');
        const sendButton = await findSendButton('Direkt Versenden');
        await waitFor(() => expect(sendButton).toBeEnabled());
        await user.click(sendButton);

        await waitFor(() => expect(mocks.createAccountInvite).toHaveBeenCalledTimes(1));
        const payload = mocks.createAccountInvite.mock.calls[0][0];
        expect(payload.tenantIdAllocationMode).toBe('MANUAL');
        expect(payload.tenantId).toBe(21);
        expect(mocks.tenantIdAllocationClient.reserveId).toHaveBeenCalledWith({
            allocationMode: 'MANUAL',
            id: 21,
        });
    });

    it('parses a picked CSV client-side and opens the preview modal (#315)', async () => {
        await renderTenantTab();
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

    it('opens the templates dialog in create view from the template menu', async () => {
        await renderTenantTab();
        const user = userEvent.setup();

        await screen.findByRole('button', { name: /Standard/ });
        await user.click(screen.getByRole('button', { name: 'E-Mail-Vorlage wählen' }));
        await user.click(await screen.findByRole('menuitem', { name: 'Neue E-Mail-Vorlage erstellen' }));

        expect(await screen.findByTestId('templates-dialog')).toHaveTextContent('create');
    });

    it('opens the templates dialog list view from the delete menu entry', async () => {
        await renderTenantTab();
        const user = userEvent.setup();

        await screen.findByRole('button', { name: /Standard/ });
        await user.click(screen.getByRole('button', { name: 'E-Mail-Vorlage wählen' }));
        await user.click(await screen.findByRole('menuitem', { name: 'E-Mail-Vorlage löschen' }));

        expect(await screen.findByTestId('templates-dialog')).toHaveTextContent('list');
    });
});
