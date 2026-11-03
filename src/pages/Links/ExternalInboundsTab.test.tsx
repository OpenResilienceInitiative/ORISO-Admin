import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TopicInviteLinkDTO } from '../../api/invitelinks/topicInviteLinks';
import { ExternalInboundsTab } from './ExternalInboundsTab';
import en from '../../locales/en/translation.json';

const mocks = vi.hoisted(() => ({
    listTopicInviteLinks: vi.fn(),
    deactivateTopicInviteLink: vi.fn(),
    messageError: vi.fn(),
    messageSuccess: vi.fn(),
}));

vi.mock('../../api/invitelinks/topicInviteLinks', async () => {
    const actual = await vi.importActual<typeof import('../../api/invitelinks/topicInviteLinks')>(
        '../../api/invitelinks/topicInviteLinks',
    );
    return {
        ...actual,
        listTopicInviteLinks: mocks.listTopicInviteLinks,
        deactivateTopicInviteLink: mocks.deactivateTopicInviteLink,
    };
});

vi.mock('../../hooks/useTenantTopics', () => ({
    useTenantTopics: () => ({ data: [{ id: 5, name: 'Sozialberatung' }], isLoading: false }),
}));

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

describe('ExternalInboundsTab deactivate', () => {
    afterEach(cleanup);

    beforeEach(() => {
        Object.values(mocks).forEach((m) => m.mockReset());
    });

    it('offers deactivate only for ACTIVE links', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(
            page([link({ id: 1 }), link({ id: 2, status: 'DISABLED' }), link({ id: 3, status: 'EXPIRED' })]),
        );

        render(<ExternalInboundsTab />);

        await screen.findAllByText('Sozialberatung');
        expect(screen.getAllByRole('button', { name: 'Deactivate' })).toHaveLength(1);
    });

    it('offers deactivate only for external live-chat inbounds, not other link kinds', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(
            page([link({ id: 1, linkKind: 'TENANT' }), link({ id: 2, linkKind: 'COUNSELLOR' })]),
        );

        render(<ExternalInboundsTab />);

        await screen.findAllByText('Sozialberatung');
        expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
    });

    it('asks first, then deactivates and reloads the list', async () => {
        mocks.listTopicInviteLinks
            .mockResolvedValueOnce(page([link()]))
            .mockResolvedValueOnce(page([link({ status: 'DISABLED' })]));
        mocks.deactivateTopicInviteLink.mockResolvedValue(link({ status: 'DISABLED' }));
        const user = userEvent.setup();

        render(<ExternalInboundsTab />);
        await user.click(await screen.findByRole('button', { name: 'Deactivate' }));

        expect(mocks.deactivateTopicInviteLink).not.toHaveBeenCalled();
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/Sozialberatung/)).toBeTruthy();
        await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

        await waitFor(() => expect(mocks.deactivateTopicInviteLink).toHaveBeenCalledWith(1));
        await waitFor(() => expect(mocks.listTopicInviteLinks).toHaveBeenCalledTimes(2));
        expect(mocks.messageSuccess).toHaveBeenCalledWith('Link deactivated');
        expect(await screen.findByText('DISABLED')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
    });

    it('does nothing when the admin cancels', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([link()]));
        const user = userEvent.setup();

        render(<ExternalInboundsTab />);
        await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

        expect(mocks.deactivateTopicInviteLink).not.toHaveBeenCalled();
    });

    it('says so, and keeps the link listed, when deactivating fails', async () => {
        mocks.listTopicInviteLinks.mockResolvedValue(page([link()]));
        mocks.deactivateTopicInviteLink.mockRejectedValue('FORBIDDEN');
        const user = userEvent.setup();

        render(<ExternalInboundsTab />);
        await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Deactivate' }));

        await waitFor(() => expect(mocks.messageError).toHaveBeenCalledWith('Could not deactivate link'));
        expect(mocks.messageSuccess).not.toHaveBeenCalled();
        expect(screen.getByText('ACTIVE')).toBeTruthy();
    });
});
