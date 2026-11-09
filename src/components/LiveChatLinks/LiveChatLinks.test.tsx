import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TopicInviteLinkDTO } from '../../api/invitelinks/topicInviteLinks';
import { LiveChatLinks } from './LiveChatLinks';
import en from '../../locales/en/translation.json';

const mocks = vi.hoisted(() => ({
    listTopicInviteLinks: vi.fn(),
    deactivateTopicInviteLink: vi.fn(),
    createTopicInviteLink: vi.fn(),
    reactivateTopicInviteLink: vi.fn(),
    deleteTopicInviteLink: vi.fn(),
    messageError: vi.fn(),
    messageSuccess: vi.fn(),
}));
const topicQuery = vi.hoisted(() => vi.fn());
const topic = { id: 5, name: 'Sozialberatung' };

vi.mock('../../api/invitelinks/topicInviteLinks', async () => {
    const actual = await vi.importActual<typeof import('../../api/invitelinks/topicInviteLinks')>(
        '../../api/invitelinks/topicInviteLinks',
    );
    return {
        ...actual,
        listTopicInviteLinks: mocks.listTopicInviteLinks,
        deactivateTopicInviteLink: mocks.deactivateTopicInviteLink,
        createTopicInviteLink: mocks.createTopicInviteLink,
        reactivateTopicInviteLink: mocks.reactivateTopicInviteLink,
        deleteTopicInviteLink: mocks.deleteTopicInviteLink,
    };
});

vi.mock('../../hooks/useLiveChatLinkTopics', () => ({
    useLiveChatLinkTopics: topicQuery,
}));

beforeEach(() => {
    topicQuery.mockReset().mockReturnValue({ data: [topic], isLoading: false, isError: false });
});

vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return { ...actual, message: { error: mocks.messageError, success: mocks.messageSuccess } };
});

// Real English wording, so the test reads what an admin reads.
const translations = en as Record<string, string>;
// A stable `t`, like the real hook's: the tab reloads its list when `t` changes.
const t = (key: string, fallback?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
    const values = typeof fallback === 'object' ? fallback : options ?? {};
    const text = translations[key] ?? (typeof fallback === 'string' ? fallback : key);
    return text.replace(/{{\s*(\w+)\s*}}/g, (_, name: string) => String(values[name] ?? `{{${name}}}`));
};
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));

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

const link = (over: Partial<TopicInviteLinkDTO> = {}): TopicInviteLinkDTO => ({
    id: 1,
    token: 'tok-1',
    tenantId: 1,
    topicId: 5,
    topicName: 'Sozialberatung',
    linkKind: 'EXTERNAL_INBOUND',
    chatType: 'LIVE_CHAT',
    anonymity: 'FULL',
    consultantId: null,
    notes: null,
    createdByUserId: 'u1',
    createdByUsername: 'admin',
    createDate: '2026-10-01T10:00:00Z',
    expiresAt: null,
    usedAt: null,
    usedBySessionId: null,
    status: 'ACTIVE',
    ...over,
});

const page = (content: TopicInviteLinkDTO[]) => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    page: 0,
    size: 20,
});

describe('LiveChatLinks — manage (platform admin)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        Object.values(mocks).forEach((m) => m.mockReset());
    });

    it('offers deactivate only for ACTIVE links, delete for all of them', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(
            page([link({ id: 1 }), link({ id: 2, status: 'DISABLED' }), link({ id: 3, status: 'EXPIRED' })]),
        );

        render(<LiveChatLinks mode="manage" />);

        await screen.findAllByText('Sozialberatung');
        expect(screen.getAllByRole('button', { name: 'Deactivate' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: 'Reactivate' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(3);
    });

    it('offers deactivate only for external live-chat inbounds, not other link kinds', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(
            page([link({ id: 1, linkKind: 'TENANT' }), link({ id: 2, linkKind: 'COUNSELLOR' })]),
        );

        render(<LiveChatLinks mode="manage" />);

        await screen.findAllByText('Sozialberatung');
        expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
    });

    it('creates a live-chat link for the chosen topic and lists it, without asking for a chat type', async () => {
        mocks.listTopicInviteLinks.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([link()]));
        mocks.createTopicInviteLink.mockResolvedValue(link());
        const user = userEvent.setup();

        render(<LiveChatLinks mode="manage" tenantId={7} />);
        await screen.findByText(translations['liveChatLinks.manage.empty']);
        expect(screen.getByRole('button', { name: 'Create link' })).toBeDisabled();
        expect(screen.queryByText('Chat Type')).toBeNull();

        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByTitle('Sozialberatung'));
        await user.click(screen.getByRole('button', { name: 'Create link' }));

        await waitFor(() =>
            expect(mocks.createTopicInviteLink).toHaveBeenCalledWith(
                {
                    topicId: 5,
                    linkKind: 'EXTERNAL_INBOUND',
                    chatType: 'LIVE_CHAT',
                    anonymity: 'FULL',
                },
                7,
            ),
        );
        expect(await screen.findByRole('button', { name: 'Copy' })).toBeTruthy();
    });

    it('disables creation and shows an alert when a selected topic can no longer be loaded', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([]));
        const user = userEvent.setup();
        const { rerender } = render(<LiveChatLinks mode="manage" tenantId={7} />);
        await screen.findByText(translations['liveChatLinks.manage.empty']);
        await user.click(screen.getByRole('combobox'));
        await user.click(await screen.findByTitle(topic.name));
        expect(screen.getByRole('button', { name: 'Create link' })).toBeEnabled();

        topicQuery.mockReturnValue({ data: [topic], isLoading: false, isError: true });
        rerender(<LiveChatLinks mode="manage" tenantId={7} />);

        expect(screen.getByRole('alert')).toHaveTextContent(translations['liveChatLinks.topicsFailed']);
        expect(screen.getByRole('button', { name: 'Create link' })).toBeDisabled();
        expect(mocks.createTopicInviteLink).not.toHaveBeenCalled();
    });

    it('asks first, then deactivates and reloads the list', async () => {
        mocks.listTopicInviteLinks
            .mockResolvedValueOnce(page([link()]))
            .mockResolvedValueOnce(page([link({ status: 'DISABLED' })]));
        mocks.deactivateTopicInviteLink.mockResolvedValue(link({ status: 'DISABLED' }));
        const user = userEvent.setup();

        render(<LiveChatLinks mode="manage" tenantId={7} />);
        await user.click(await screen.findByRole('button', { name: 'Deactivate' }));

        expect(mocks.deactivateTopicInviteLink).not.toHaveBeenCalled();
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/Sozialberatung/)).toBeTruthy();
        await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

        await waitFor(() => expect(mocks.deactivateTopicInviteLink).toHaveBeenCalledWith(1, 7));
        await waitFor(() => expect(mocks.listTopicInviteLinks).toHaveBeenCalledTimes(2));
        expect(mocks.messageSuccess).toHaveBeenCalledWith('Link deactivated');
        expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
    });

    it('reactivates a deactivated link, which offers no copy while it is off', async () => {
        mocks.listTopicInviteLinks
            .mockResolvedValueOnce(page([link({ status: 'DISABLED' })]))
            .mockResolvedValueOnce(page([link()]));
        mocks.reactivateTopicInviteLink.mockResolvedValue(link());
        const user = userEvent.setup();

        render(<LiveChatLinks mode="manage" tenantId={7} />);
        const reactivate = await screen.findByRole('button', { name: 'Reactivate' });
        expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
        await user.click(reactivate);

        await waitFor(() => expect(mocks.reactivateTopicInviteLink).toHaveBeenCalledWith(1, 7));
        expect(await screen.findByRole('button', { name: 'Copy' })).toBeTruthy();
    });

    it('asks before deleting a link for good, then removes it from the list', async () => {
        mocks.listTopicInviteLinks.mockResolvedValueOnce(page([link()])).mockResolvedValueOnce(page([]));
        mocks.deleteTopicInviteLink.mockResolvedValue(undefined);
        const user = userEvent.setup();

        render(<LiveChatLinks mode="manage" tenantId={7} />);
        await user.click(await screen.findByRole('button', { name: 'Delete' }));

        expect(mocks.deleteTopicInviteLink).not.toHaveBeenCalled();
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

        await waitFor(() => expect(mocks.deleteTopicInviteLink).toHaveBeenCalledWith(1, 7));
        expect(await screen.findByText(translations['liveChatLinks.manage.empty'])).toBeTruthy();
    });

    it('does nothing when the admin cancels', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([link()]));
        const user = userEvent.setup();

        render(<LiveChatLinks mode="manage" />);
        await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

        expect(mocks.deactivateTopicInviteLink).not.toHaveBeenCalled();
    });

    it('says so, and keeps the link listed, when deactivating fails', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([link()]));
        mocks.deactivateTopicInviteLink.mockRejectedValue('FORBIDDEN');
        const user = userEvent.setup();

        render(<LiveChatLinks mode="manage" />);
        await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deactivate' }));

        await waitFor(() => expect(mocks.messageError).toHaveBeenCalledWith('Could not deactivate link'));
        expect(mocks.messageSuccess).not.toHaveBeenCalled();
        expect(screen.getByText('Sozialberatung')).toBeTruthy();
    });
});

describe('LiveChatLinks — what it asks the server for (ORISO-Admin#1321)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        Object.values(mocks).forEach((m) => m.mockReset());
    });

    it('asks for live-chat links only, not account invites', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([]));

        render(<LiveChatLinks mode="manage" />);

        await waitFor(() =>
            expect(mocks.listTopicInviteLinks).toHaveBeenCalledWith(
                expect.objectContaining({ linkKind: 'EXTERNAL_INBOUND', status: undefined }),
            ),
        );
    });

    it('in read-only mode asks for active links only', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([]));

        render(<LiveChatLinks mode="read" />);

        await waitFor(() =>
            expect(mocks.listTopicInviteLinks).toHaveBeenCalledWith(
                expect.objectContaining({ linkKind: 'EXTERNAL_INBOUND', status: 'ACTIVE' }),
            ),
        );
    });
});

describe('LiveChatLinks — read only (Träger and Beratungsstellen admins)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        Object.values(mocks).forEach((m) => m.mockReset());
    });

    it('lets them copy a link but not create or deactivate one', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([link()]));

        render(<LiveChatLinks mode="read" />);

        await screen.findAllByText('Sozialberatung');
        expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Create link' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Reactivate' })).toBeNull();
    });

    it('explains an empty list instead of showing an empty table', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([]));

        render(<LiveChatLinks mode="read" />);

        expect(await screen.findByText(translations['liveChatLinks.readOnly.empty'])).toBeTruthy();
    });

    it('says the platform admin manages the links', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([link()]));

        render(<LiveChatLinks mode="read" />);

        expect(await screen.findByText(translations['liveChatLinks.readOnly.hint'])).toBeTruthy();
    });
});
