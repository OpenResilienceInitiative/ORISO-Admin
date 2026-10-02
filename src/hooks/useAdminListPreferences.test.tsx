import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/fetchData', () => ({
    fetchData: vi.fn(() => Promise.resolve()),
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT' },
    FETCH_ERRORS: { CATCH_ALL_SILENT: 'CATCH_ALL_SILENT', FORBIDDEN_SILENT: 'FORBIDDEN_SILENT' },
}));

// eslint-disable-next-line import/first
import { fetchData } from '../api/fetchData';
// eslint-disable-next-line import/first
import { SAVE_SORT_DELAY_MS, useSaveAdminListSort } from './useAdminListPreferences';

const fetchMock = vi.mocked(fetchData);

const render = (client = new QueryClient()) => {
    return renderHook(() => useSaveAdminListSort(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
    });
};

describe('useSaveAdminListSort', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        fetchMock.mockClear();
    });
    afterEach(() => vi.useRealTimers());

    it('sends one PUT with the last sort after two quick changes', () => {
        const { result } = render();
        act(() => {
            result.current('consultants', { field: 'LASTNAME', order: 'ASC' });
            result.current('consultants', { field: 'LASTNAME', order: 'DESC' });
        });
        expect(fetchMock).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(SAVE_SORT_DELAY_MS);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toMatchObject({
            method: 'PUT',
            bodyData: JSON.stringify({ field: 'LASTNAME', order: 'DESC' }),
        });
    });

    it('still sends a waiting sort when the tab unmounts', () => {
        const { result, unmount } = render();
        act(() => result.current('consultants', { field: 'EMAIL', order: 'ASC' }));
        unmount();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('waits for an older in-flight write before sending the latest sort', async () => {
        let finishFirst!: () => void;
        fetchMock.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    finishFirst = resolve;
                }),
        );
        const { result } = render();
        act(() => {
            result.current('consultants', { field: 'LASTNAME', order: 'ASC' });
            vi.advanceTimersByTime(SAVE_SORT_DELAY_MS);
            result.current('consultants', { field: 'EMAIL', order: 'DESC' });
            vi.advanceTimersByTime(SAVE_SORT_DELAY_MS);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await act(async () => finishFirst());

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0].bodyData).toBe(JSON.stringify({ field: 'EMAIL', order: 'DESC' }));
    });

    it('keeps writes in order when an unmount flushes a pending sort and the tab remounts', async () => {
        let finishFirst!: () => void;
        fetchMock.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    finishFirst = resolve;
                }),
        );
        const client = new QueryClient();
        const firstTab = render(client);
        act(() => {
            firstTab.result.current('consultants', { field: 'LASTNAME', order: 'ASC' });
            vi.advanceTimersByTime(SAVE_SORT_DELAY_MS);
            firstTab.result.current('consultants', { field: 'EMAIL', order: 'DESC' });
        });
        firstTab.unmount();
        const reopenedTab = render(client);
        act(() => {
            reopenedTab.result.current('consultants', { field: 'FIRSTNAME', order: 'ASC' });
            vi.advanceTimersByTime(SAVE_SORT_DELAY_MS);
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await act(async () => finishFirst());

        expect(fetchMock.mock.calls.map(([request]) => request.bodyData)).toEqual([
            JSON.stringify({ field: 'LASTNAME', order: 'ASC' }),
            JSON.stringify({ field: 'EMAIL', order: 'DESC' }),
            JSON.stringify({ field: 'FIRSTNAME', order: 'ASC' }),
        ]);
    });

    it('does not block another tab or another query client behind a pending write', async () => {
        let finishFirst!: () => void;
        fetchMock.mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    finishFirst = resolve;
                }),
        );
        const firstSession = render();
        const secondSession = render();
        act(() => {
            firstSession.result.current('consultants', { field: 'LASTNAME', order: 'ASC' });
            vi.advanceTimersByTime(SAVE_SORT_DELAY_MS);
            firstSession.result.current('tenant-admins', { field: 'EMAIL', order: 'DESC' });
            secondSession.result.current('consultants', { field: 'FIRSTNAME', order: 'DESC' });
            vi.advanceTimersByTime(SAVE_SORT_DELAY_MS);
        });

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[1][0].url).toContain('/sorts/tenant-admins');
        expect(fetchMock.mock.calls[2][0].bodyData).toBe(JSON.stringify({ field: 'FIRSTNAME', order: 'DESC' }));
        await act(async () => finishFirst());
    });
});
