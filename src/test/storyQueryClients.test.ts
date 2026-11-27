import { createElement } from 'react';
import { render } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vite-plus/test';
import { withSeededAdminProviders } from '../utils/storybook/adminStoryDecorators';
import { clearStoryQueryClients, createStoryQueryClient } from '../../.storybook/queryClients';

describe('story-local query fixtures', () => {
    it('isolates query caches and cancels/clears them at teardown', async () => {
        const first = createStoryQueryClient();
        const second = createStoryQueryClient();
        first.setQueryData(['tenant'], { id: 'first-story-only' });
        expect(second.getQueryData(['tenant'])).toBeUndefined();
        let cancelled = false;
        const pending = first
            .fetchQuery({
                queryKey: ['in-flight'],
                queryFn: ({ signal }) =>
                    new Promise((resolve) => {
                        signal.addEventListener('abort', () => {
                            cancelled = true;
                            resolve(null);
                        });
                    }),
            })
            .catch(() => undefined);
        await clearStoryQueryClients();
        await pending;
        expect(cancelled).toBe(true);
        expect(first.getQueryCache().getAll()).toHaveLength(0);
        expect(createStoryQueryClient().getQueryData(['tenant'])).toBeUndefined();
        await clearStoryQueryClients();
    });
    it('also tears down clients created by the shared page-story provider', async () => {
        const clients: QueryClient[] = [];
        render(
            withSeededAdminProviders(
                () => createElement('p', null, 'Nested provider'),
                (client) => {
                    clients.push(client);
                    client.setQueryData(['nested-fixture'], 'must not leak');
                },
            ),
        );
        expect(clients[0].getQueryCache().getAll()).toHaveLength(1);
        await clearStoryQueryClients();
        expect(clients[0].getQueryCache().getAll()).toHaveLength(0);
    });
});

it('clears owned query caches even when cancellation rejects', async () => {
    const client = createStoryQueryClient();
    client.setQueryData(['cleanup-rejection'], 'must not leak');
    const cancel = vi.spyOn(client, 'cancelQueries').mockRejectedValue(new Error('controlled cancellation failure'));
    try {
        await expect(clearStoryQueryClients()).rejects.toThrow('controlled cancellation failure');
        expect(client.getQueryCache().getAll()).toHaveLength(0);
    } finally {
        cancel.mockRestore();
        await clearStoryQueryClients();
    }
});

it('waits for every owned cancellation before clearing and reports all cancellation failures', async () => {
    const first = createStoryQueryClient();
    const second = createStoryQueryClient();
    second.setQueryData(['waiting-cleanup'], 'still owned');
    let rejectSecond: (error: Error) => void = () => undefined;
    const later = new Promise<void>((_resolve, reject) => {
        rejectSecond = reject;
    });
    const firstCancel = vi.spyOn(first, 'cancelQueries').mockRejectedValue(new Error('first cancellation failed'));
    const secondCancel = vi.spyOn(second, 'cancelQueries').mockReturnValue(later);
    let completed = false;
    const cleanupResult = clearStoryQueryClients()
        .then(
            () => undefined,
            (error: unknown) => error,
        )
        .finally(() => {
            completed = true;
        });
    try {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(completed).toBe(false);
        expect(second.getQueryData(['waiting-cleanup'])).toBe('still owned');
    } finally {
        rejectSecond(new Error('second cancellation failed'));
        const failure = await cleanupResult;
        firstCancel.mockRestore();
        secondCancel.mockRestore();
        await clearStoryQueryClients();
        expect(String(failure)).toContain('first cancellation failed');
        expect(String(failure)).toContain('second cancellation failed');
        expect(second.getQueryCache().getAll()).toHaveLength(0);
    }
});
