import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable language driven by the mocked useLanguage hook, so each case can flip
// the UI language and assert the topic query refetches (#564).
const state = vi.hoisted(() => ({ language: 'de' as 'de' | 'en' }));

vi.mock('./useLanguage', () => ({
    useLanguage: () => ({ language: state.language, options: [], changeLanguage: vi.fn() }),
}));

const mocks = vi.hoisted(() => ({
    // Every data source returns a value tagged with the *current* UI language,
    // so a stale cache (missing language in the key) is observable as stale data.
    getTopicByTenantData: vi.fn(() => Promise.resolve([{ id: 1, name: `topic-${state.language}`, status: 'ACTIVE' }])),
    getTopicData: vi.fn(() => Promise.resolve({ name: `topic-${state.language}` })),
    fetchData: vi.fn(() => Promise.resolve({ name: `topic-${state.language}` })),
}));

vi.mock('../api/topic/getTopicByTenantData', () => ({ default: mocks.getTopicByTenantData }));
vi.mock('../api/topic/getTopicData', () => ({ default: mocks.getTopicData }));
vi.mock('../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/fetchData')>();
    return { ...actual, fetchData: mocks.fetchData };
});

// eslint-disable-next-line import/first
import { useTenantTopics } from './useTenantTopics';
// eslint-disable-next-line import/first
import { useTopicList } from './useTopicList';
// eslint-disable-next-line import/first
import { useTopicData } from './useTopicData';
// eslint-disable-next-line import/first
import { useTopicsAdmin } from './useTopicsAdmin';

type Case = {
    name: string;
    fetchMock: () => ReturnType<typeof vi.fn>;
    render: (wrapper: React.FC<{ children: React.ReactNode }>) => ReturnType<typeof renderHook>;
    readName: (data: unknown) => string | undefined;
};

const cases: Case[] = [
    {
        name: 'useTenantTopics',
        fetchMock: () => mocks.getTopicByTenantData,
        render: (wrapper) => renderHook(() => useTenantTopics(true), { wrapper }),
        readName: (data) => (data as Array<{ name: string }> | undefined)?.[0]?.name,
    },
    {
        name: 'useTopicList',
        fetchMock: () => mocks.getTopicData,
        render: (wrapper) => renderHook(() => useTopicList({ current: 1, pageSize: 10 }), { wrapper }),
        readName: (data) => (data as { name?: string } | undefined)?.name,
    },
    {
        name: 'useTopicData',
        fetchMock: () => mocks.fetchData,
        render: (wrapper) => renderHook(() => useTopicData({ id: '42' }), { wrapper }),
        readName: (data) => (data as { name?: string } | undefined)?.name,
    },
    {
        name: 'useTopicsAdmin',
        fetchMock: () => mocks.fetchData,
        render: (wrapper) => renderHook(() => useTopicsAdmin(true), { wrapper }),
        readName: (data) => (data as { name?: string } | undefined)?.name,
    },
];

describe('topic hooks refetch on UI language change (#564)', () => {
    beforeEach(() => {
        state.language = 'de';
        mocks.getTopicByTenantData.mockClear();
        mocks.getTopicData.mockClear();
        mocks.fetchData.mockClear();
    });

    it.each(cases)(
        '$name keys its cache by language and refetches on switch',
        async ({ fetchMock, render, readName }) => {
            const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            const wrapper = ({ children }: { children: React.ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result, rerender } = render(wrapper);

            await waitFor(() => expect(readName((result.current as { data: unknown }).data)).toBe('topic-de'));
            const callsAfterGerman = fetchMock().mock.calls.length;

            // Switch the UI language and re-render: a language-aware key must produce
            // a new query and serve the English name, not the cached German one.
            state.language = 'en';
            rerender();

            await waitFor(() => expect(readName((result.current as { data: unknown }).data)).toBe('topic-en'));
            expect(fetchMock().mock.calls.length).toBeGreaterThan(callsAfterGerman);
        },
    );
});
