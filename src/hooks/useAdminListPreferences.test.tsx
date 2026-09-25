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

const render = () => {
    const client = new QueryClient();
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
});
