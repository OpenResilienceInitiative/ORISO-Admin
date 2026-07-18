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
