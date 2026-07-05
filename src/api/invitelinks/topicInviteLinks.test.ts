import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_METHODS } from '../fetchData';
import {
    buildTopicInviteLinkUrl,
    createTopicInviteLink,
    formatAnonymityLabel,
    formatChatTypeLabel,
    listTopicInviteLinks,
} from './topicInviteLinks';
import { invitelinksEndpoint } from './inviteLinkApiShared';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');

    return {
        ...actual,
        fetchData: mocks.fetchData,
    };
});

vi.mock('../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: () => ({ tenantId: 9 }),
}));

describe('topic invite links API', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('builds an invite URL with an encoded topic name', () => {
        expect(buildTopicInviteLinkUrl('abc123', 'Youth & Family')).toContain('/invite/abc123/Youth%20%26%20Family');
    });

    it('omits empty topic names from invite URLs', () => {
        expect(buildTopicInviteLinkUrl('abc123', ' undefined ')).toMatch(/\/invite\/abc123$/);
    });

    it('lists topic invite links with pagination and tenant headers', async () => {
        mocks.fetchData.mockResolvedValueOnce([{ id: 1, token: 'token' }]);

        const result = await listTopicInviteLinks({ page: 2, size: 5, tenantId: 77 });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${invitelinksEndpoint}?page=2&size=5`,
                method: FETCH_METHODS.GET,
                headersData: { 'X-Tenant-Id': '77' },
            }),
        );
        expect(result.content).toEqual([{ id: 1, token: 'token' }]);
    });

    it('creates a topic invite link with only supplied optional fields', async () => {
        const responseBody = { id: 1, token: 'token' };
        mocks.fetchData.mockResolvedValueOnce({ json: async () => responseBody });

        const result = await createTopicInviteLink(
            {
                anonymity: 'FULL',
                chatType: 'LIVE_CHAT',
                expiresInDays: 7,
                linkKind: 'TENANT',
                notes: 'For testing',
                topicId: 5,
            },
            77,
        );

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.POST,
                headersData: { 'X-Tenant-Id': '77' },
            }),
        );
        expect(JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData)).toEqual({
            anonymity: 'FULL',
            chatType: 'LIVE_CHAT',
            expiresInDays: 7,
            linkKind: 'TENANT',
            notes: 'For testing',
            topicId: 5,
        });
        expect(result).toEqual(responseBody);
    });

    it('formats known labels and falls back to raw values', () => {
        expect(formatChatTypeLabel('LIVE_CHAT')).toBe('Live Chat');
        expect(formatChatTypeLabel('UNKNOWN')).toBe('UNKNOWN');
        expect(formatAnonymityLabel('FULL')).toBe('Full');
        expect(formatAnonymityLabel('PARTIAL')).toBe('PARTIAL');
    });
});
