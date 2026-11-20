import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({ getTopicByTenantData: vi.fn() }));
vi.mock('../api/topic/getTopicByTenantData', () => ({ default: mocks.getTopicByTenantData }));

vi.mock('./useLanguage', () => ({ useLanguage: () => ({ language: 'de' }) }));

import { useTenantTopics } from './useTenantTopics';

const renderTopics = (...args: Parameters<typeof useTenantTopics>) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, ...renderHook(() => useTenantTopics(...args), { wrapper }) };
};

beforeEach(() => {
    mocks.getTopicByTenantData.mockReset();
});

describe('useTenantTopics', () => {
    it('keeps only the active topics when asked to', async () => {
        mocks.getTopicByTenantData.mockResolvedValue([
            { id: 1, name: 'Active', status: 'ACTIVE' },
            { id: 2, name: 'Draft', status: 'INACTIVE' },
        ]);
        const { result } = renderTopics(true);

        await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: 'Active', status: 'ACTIVE' }]));
    });

    it('answers with an empty list when the topic service fails, so pages without topics keep working', async () => {
        mocks.getTopicByTenantData.mockImplementation(() => Promise.reject(new Error('topic service down')));
        const { result } = renderTopics(true);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
        expect(result.current.isError).toBe(false);
    });

    it('reports the failure to a fail-closed caller instead of an empty list', async () => {
        mocks.getTopicByTenantData.mockImplementation(() => Promise.reject(new Error('topic service down')));
        const { result } = renderTopics(true, true, { failClosed: true });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.data).toBeUndefined();
    });

    it('keys the topic list by UI language so a language switch refetches the translated names (#564)', async () => {
        mocks.getTopicByTenantData.mockResolvedValue([]);
        const { client } = renderTopics(true);

        await waitFor(() => expect(client.getQueryData(['ALL_TOPICS', true, 'de'])).toEqual([]));
        expect(client.getQueryData(['ALL_TOPICS', true, 'en'])).toBeUndefined();
    });

    it('does not share a cached result between the default and the fail-closed mode', async () => {
        mocks.getTopicByTenantData.mockResolvedValue([]);
        const { client } = renderTopics(true, true, { failClosed: true });

        await waitFor(() => expect(client.getQueryCache().getAll()).toHaveLength(1));
        const keys = client
            .getQueryCache()
            .getAll()
            .map((query) => query.queryKey);
        expect(keys[0]).toEqual(['ALL_TOPICS', true, 'de', 'fail-closed']);
        expect(client.getQueryCache().find({ queryKey: ['ALL_TOPICS', true, 'de'], exact: true })).toBeUndefined();
    });
});
