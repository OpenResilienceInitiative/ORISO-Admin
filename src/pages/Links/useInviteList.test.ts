import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountInviteDTO, PagedAccountInviteResponse } from '../../api/accountInvites/accountInvites';
import { useInviteList, type InviteListQuery } from './useInviteList';

const mocks = vi.hoisted(() => ({ list: vi.fn(), error: vi.fn() }));
const t = (_key: string, fallback: string) => fallback;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));
vi.mock('antd', () => ({ message: { error: mocks.error } }));
vi.mock('../../api/accountInvites/accountInvites', () => ({ listAccountInvites: mocks.list }));

const initial: InviteListQuery = { query: '', page: 1, pageSize: 20, phase: null, sort: null };
const response = (content: AccountInviteDTO[] = [], totalElements = 61): PagedAccountInviteResponse => ({
    content,
    totalElements,
    totalPages: Math.ceil(totalElements / 20),
    page: 0,
    size: 20,
    phaseCounts: { INVITED: totalElements },
});

describe('server invitation listing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.list.mockResolvedValue(response());
    });

    it('loads only one server page even when the response advertises additional pages', async () => {
        const { result } = renderHook(() => useInviteList('tenant', 'platform', initial));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(mocks.list).toHaveBeenCalledTimes(1);
        expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 20, tab: 'TENANT' }));
        expect(result.current.totalElements).toBe(61);
    });

    it('sends each query/page/bucket/sort change to the server', async () => {
        const { result, rerender } = renderHook(({ request }) => useInviteList('counsellor', 'tenant', request), {
            initialProps: { request: initial },
        });
        await waitFor(() => expect(result.current.loading).toBe(false));
        rerender({
            request: {
                ...initial,
                query: 'Mona Simpson',
                page: 2,
                phase: 'needsAction',
                sort: { key: 'recipient', direction: 'asc' },
            },
        });
        await waitFor(() =>
            expect(mocks.list).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    page: 1,
                    query: 'Mona Simpson',
                    progressPhases: ['NEEDS_ACTION', 'CLOSED'],
                    sort: 'recipient',
                    sortDirection: 'asc',
                }),
            ),
        );
    });

    it('ignores superseded results and does not replace newer metadata', async () => {
        let resolveOld!: (value: PagedAccountInviteResponse) => void;
        mocks.list.mockImplementationOnce(
            () =>
                new Promise<PagedAccountInviteResponse>((resolve) => {
                    resolveOld = resolve;
                }),
        );
        const { result, rerender } = renderHook(({ request }) => useInviteList('tenant', 'platform', request), {
            initialProps: { request: initial },
        });
        mocks.list.mockResolvedValueOnce(response([], 1));
        rerender({ request: { ...initial, query: 'Mona' } });
        await waitFor(() => expect(result.current.totalElements).toBe(1));
        await act(async () => resolveOld(response([], 61)));
        expect(result.current.totalElements).toBe(1);
        expect(result.current.loading).toBe(false);
    });

    it('clears results and exposes a failed search instead of showing stale success', async () => {
        const { result, rerender } = renderHook(({ request }) => useInviteList('tenant', 'platform', request), {
            initialProps: { request: initial },
        });
        await waitFor(() => expect(result.current.totalElements).toBe(61));
        mocks.list.mockRejectedValueOnce(new Error('network failure'));
        rerender({ request: { ...initial, query: 'unavailable' } });
        await waitFor(() => expect(result.current.error).toBe(true));
        expect(result.current.invites).toEqual([]);
        expect(result.current.totalElements).toBe(0);
        expect(mocks.error).toHaveBeenCalledTimes(1);
    });
});
