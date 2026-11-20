import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
    useQuery: vi.fn(),
    useTenantTopics: vi.fn(),
    listLiveChatLinkTopics: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@tanstack/react-query')>()),
    useQuery: mocks.useQuery,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: 'de', language: 'de' } }) }));
vi.mock('../api/invitelinks/topicInviteLinks', () => ({ listLiveChatLinkTopics: mocks.listLiveChatLinkTopics }));
vi.mock('./useTenantTopics', () => ({ useTenantTopics: mocks.useTenantTopics }));

import { skipToken } from '@tanstack/react-query';
import { useLiveChatLinkTopics } from './useLiveChatLinkTopics';

const defaultResult = { data: ['default'] };
const scopedResult = { data: ['scoped'] };

beforeEach(() => {
    mocks.useQuery.mockReset().mockReturnValue(scopedResult);
    mocks.useTenantTopics.mockReset().mockReturnValue(defaultResult);
});

describe('useLiveChatLinkTopics', () => {
    it('loads the topics of the selected tenant for a positive tenant ID', () => {
        const { result } = renderHook(() => useLiveChatLinkTopics(7));

        expect(result.current).toBe(scopedResult);
        expect(mocks.useTenantTopics).toHaveBeenCalledWith(true, false);
        const options = mocks.useQuery.mock.calls[0][0];
        expect(options.queryKey).toEqual(['LIVE_CHAT_LINK_TOPICS', 7, 'de']);
        options.queryFn({ signal: undefined });
        expect(mocks.listLiveChatLinkTopics).toHaveBeenCalledWith(7, undefined);
    });

    it.each([undefined, 0, -3])('uses the default topics and skips the scoped request for tenant ID %s', (tenantId) => {
        const { result } = renderHook(() => useLiveChatLinkTopics(tenantId));

        expect(result.current).toBe(defaultResult);
        expect(mocks.useTenantTopics).toHaveBeenCalledWith(true, true);
        expect(mocks.useQuery.mock.calls[0][0].queryFn).toBe(skipToken);
    });
});
