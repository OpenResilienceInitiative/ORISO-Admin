import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS } from '../../../../api/fetchData';
import { getTenantLegalDraft, putTenantLegalDraft, TenantLegalDraft } from '../../../../api/tenant/legalDrafts';
import { useTenantLegalDraft } from './useTenantLegalDraft';

vi.mock('../../../../api/tenant/legalDrafts', async () => {
    const actual = await vi.importActual<typeof import('../../../../api/tenant/legalDrafts')>(
        '../../../../api/tenant/legalDrafts',
    );
    return { ...actual, getTenantLegalDraft: vi.fn(), putTenantLegalDraft: vi.fn() };
});

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: React.PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

describe('useTenantLegalDraft', () => {
    beforeEach(() => {
        vi.mocked(getTenantLegalDraft).mockReset();
        vi.mocked(putTenantLegalDraft).mockReset();
    });

    it('does not let an A-to-B-to-A late save overwrite the new A generation', async () => {
        const draft = (revision: string, de: string): TenantLegalDraft => ({
            kind: 'IMPRINT',
            content: { de },
            revision,
            updatedAt: '2026-09-21T09:00:00Z',
        });
        let finishOldA: (value: TenantLegalDraft) => void = () => undefined;
        const oldASave = new Promise<TenantLegalDraft>((resolve) => {
            finishOldA = resolve;
        });
        const oldA = draft('a:0', 'A');
        const tenantB = draft('b:0', 'B');
        const newA = draft('a:2', 'Neues A');
        vi.mocked(getTenantLegalDraft)
            .mockResolvedValueOnce(oldA)
            .mockResolvedValueOnce(tenantB)
            .mockResolvedValueOnce(newA);
        vi.mocked(putTenantLegalDraft).mockImplementationOnce(() => oldASave);
        const { result, rerender } = renderHook(({ tenantId }) => useTenantLegalDraft(tenantId, 'IMPRINT', true), {
            initialProps: { tenantId: 10 },
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(oldA));
        const pendingOldSave = result.current.save({ content: { de: 'Altes A' }, revision: oldA.revision });

        rerender({ tenantId: 11 });
        await waitFor(() => expect(result.current.draft).toEqual(tenantB));
        rerender({ tenantId: 10 });
        await waitFor(() => expect(result.current.draft).toEqual(newA));

        finishOldA(draft('a:1', 'Verspätetes A'));
        await act(async () => pendingOldSave);

        expect(result.current.draft).toEqual(newA);
    });

    it('loads an absent draft without treating the 404 mapping as a failure', async () => {
        vi.mocked(getTenantLegalDraft).mockResolvedValue(null);
        const { result } = renderHook(() => useTenantLegalDraft(0, 'PRIVACY', true), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.draft).toBeNull();
        expect(result.current.isError).toBe(false);
    });

    it('does not retry a stale write and fetches the current revision for explicit resolution', async () => {
        const original = {
            kind: 'IMPRINT' as const,
            content: { de: 'mine' },
            revision: '1:0',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        const remote = { ...original, content: { de: 'theirs' }, revision: '1:1' };
        vi.mocked(getTenantLegalDraft).mockResolvedValueOnce(original).mockResolvedValueOnce(remote);
        vi.mocked(putTenantLegalDraft).mockRejectedValue(new Error(FETCH_ERRORS.CONFLICT));
        const { result } = renderHook(() => useTenantLegalDraft(7, 'IMPRINT', true), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(original));

        await act(async () => {
            await expect(result.current.save({ content: { de: 'edited' }, revision: '1:0' })).rejects.toThrow(
                FETCH_ERRORS.CONFLICT,
            );
        });

        expect(putTenantLegalDraft).toHaveBeenCalledTimes(1);
        expect(getTenantLegalDraft).toHaveBeenCalledTimes(2);
        expect(result.current.hasConflict).toBe(true);
        expect(result.current.conflict).toEqual(remote);
        expect(result.current.draft).toEqual(original);
    });

    it('keeps the stale state blocked when refreshing the current revision fails', async () => {
        const original = {
            kind: 'IMPRINT' as const,
            content: { de: 'mine' },
            revision: '1:0',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        vi.mocked(getTenantLegalDraft).mockResolvedValueOnce(original).mockRejectedValueOnce(new Error('offline'));
        vi.mocked(putTenantLegalDraft).mockRejectedValue(new Error(FETCH_ERRORS.CONFLICT));
        const { result } = renderHook(() => useTenantLegalDraft(7, 'IMPRINT', true), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(original));

        await act(async () => {
            await expect(result.current.save({ content: { de: 'edited' }, revision: '1:0' })).rejects.toThrow();
        });

        expect(result.current.hasConflict).toBe(true);
        expect(result.current.conflictRefreshFailed).toBe(true);
        expect(result.current.conflict).toBeUndefined();
    });

    it('does not let a late previous-tenant save clear the current tenant conflict', async () => {
        let finishTenantOne: (value: TenantLegalDraft) => void = () => undefined;
        const tenantOneSave = new Promise<TenantLegalDraft>((resolve) => {
            finishTenantOne = resolve;
        });
        const tenantOne = {
            kind: 'IMPRINT' as const,
            content: { de: 'one' },
            revision: '1:0',
            updatedAt: '2026-09-17T09:00:00Z',
        };
        const tenantTwo = { ...tenantOne, content: { de: 'two' }, revision: '2:0' };
        const tenantTwoRemote = { ...tenantTwo, content: { de: 'newer two' }, revision: '2:1' };
        vi.mocked(getTenantLegalDraft)
            .mockResolvedValueOnce(tenantOne)
            .mockResolvedValueOnce(tenantTwo)
            .mockResolvedValueOnce(tenantTwoRemote);
        vi.mocked(putTenantLegalDraft)
            .mockImplementationOnce(() => tenantOneSave)
            .mockRejectedValueOnce(new Error(FETCH_ERRORS.CONFLICT));
        const { result, rerender } = renderHook(({ tenantId }) => useTenantLegalDraft(tenantId, 'IMPRINT', true), {
            initialProps: { tenantId: 1 },
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(tenantOne));
        const saveTenantOne = result.current.save({ content: { de: 'edited one' }, revision: '1:0' });

        rerender({ tenantId: 2 });
        await waitFor(() => expect(result.current.draft).toEqual(tenantTwo));
        await act(async () => {
            await expect(result.current.save({ content: { de: 'edited two' }, revision: '2:0' })).rejects.toThrow();
        });
        expect(result.current.conflict).toEqual(tenantTwoRemote);

        finishTenantOne({ ...tenantOne, revision: '1:1' });
        await act(async () => saveTenantOne);
        expect(result.current.hasConflict).toBe(true);
        expect(result.current.conflict).toEqual(tenantTwoRemote);
    });
});
