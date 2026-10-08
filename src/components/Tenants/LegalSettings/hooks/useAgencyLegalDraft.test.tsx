import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS } from '../../../../api/fetchData';
import {
    AgencyLegalDraft,
    deleteAgencyLegalDraft,
    getAgencyLegalDraft,
    putAgencyLegalDraft,
} from '../../../../api/agency/legalDrafts';
import { useAgencyLegalDraft } from './useAgencyLegalDraft';

vi.mock('../../../../api/agency/legalDrafts', async () => {
    const actual = await vi.importActual<typeof import('../../../../api/agency/legalDrafts')>(
        '../../../../api/agency/legalDrafts',
    );
    return {
        ...actual,
        deleteAgencyLegalDraft: vi.fn(),
        getAgencyLegalDraft: vi.fn(),
        putAgencyLegalDraft: vi.fn(),
    };
});

const createWrapper = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: React.PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
};

const dppDraft = (revision = 'dpp-id:0'): AgencyLegalDraft => ({
    kind: 'DPP',
    content: { de: '<p>Datenschutz</p>' },
    consentText: { de: 'Ich stimme zu.' },
    revision,
    savedAt: '2026-09-17T12:00:00',
});

const imprintDraft = (revision = 'imprint-id:0'): AgencyLegalDraft => ({
    kind: 'IMPRINT',
    content: { de: '<p>Impressum</p>' },
    consentText: {},
    revision,
    savedAt: '2026-09-17T12:00:00',
});

describe('useAgencyLegalDraft', () => {
    beforeEach(() => {
        vi.mocked(deleteAgencyLegalDraft).mockReset();
        vi.mocked(getAgencyLegalDraft).mockReset();
        vi.mocked(putAgencyLegalDraft).mockReset();
    });

    it('loads an absent draft for agency zero without treating it as an error', async () => {
        vi.mocked(getAgencyLegalDraft).mockResolvedValue(null);

        const { result } = renderHook(() => useAgencyLegalDraft(0, 'DPP', true), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(getAgencyLegalDraft).toHaveBeenCalledWith(0, 'DPP');
        expect(result.current.draft).toBeNull();
        expect(result.current.isError).toBe(false);
    });

    it('saves an initial draft without inventing a revision and updates the query', async () => {
        const saved = dppDraft();
        vi.mocked(getAgencyLegalDraft).mockResolvedValue(null);
        vi.mocked(putAgencyLegalDraft).mockResolvedValue(saved);
        const { result } = renderHook(() => useAgencyLegalDraft(3, 'DPP', true), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toBeNull());

        await act(async () => {
            await expect(
                result.current.save({
                    content: { de: '<p>Datenschutz</p>' },
                    consentText: { de: 'Ich stimme zu.' },
                }),
            ).resolves.toEqual(saved);
        });

        expect(putAgencyLegalDraft).toHaveBeenCalledWith(3, 'DPP', {
            content: { de: '<p>Datenschutz</p>' },
            consentText: { de: 'Ich stimme zu.' },
        });
        expect(result.current.draft).toEqual(saved);
    });

    it('propagates DELETE 404 and preserves the loaded draft', async () => {
        const original = imprintDraft();
        vi.mocked(getAgencyLegalDraft).mockResolvedValue(original);
        vi.mocked(deleteAgencyLegalDraft).mockRejectedValue(new Error(FETCH_ERRORS.NO_MATCH));
        const { result } = renderHook(() => useAgencyLegalDraft(4, 'IMPRINT', true), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(original));

        await act(async () => {
            await expect(result.current.discard(original.revision)).rejects.toThrow(FETCH_ERRORS.NO_MATCH);
        });

        expect(result.current.draft).toEqual(original);
        expect(result.current.hasConflict).toBe(false);
        expect(getAgencyLegalDraft).toHaveBeenCalledTimes(1);
    });

    it('preserves the loaded draft and fetches the remote draft after DELETE 409', async () => {
        const original = dppDraft('dpp-id:0');
        const remote = { ...original, content: { de: '<p>Neu</p>' }, revision: 'dpp-id:1' };
        vi.mocked(getAgencyLegalDraft).mockResolvedValueOnce(original).mockResolvedValueOnce(remote);
        vi.mocked(deleteAgencyLegalDraft).mockRejectedValue(new Error(FETCH_ERRORS.CONFLICT));
        const { result } = renderHook(() => useAgencyLegalDraft(5, 'DPP', true), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(original));

        await act(async () => {
            await expect(result.current.discard(original.revision)).rejects.toThrow(FETCH_ERRORS.CONFLICT);
        });

        expect(deleteAgencyLegalDraft).toHaveBeenCalledTimes(1);
        expect(result.current.draft).toEqual(original);
        expect(result.current.hasConflict).toBe(true);
        expect(result.current.conflict).toEqual(remote);
    });

    it('does not let a late save from an earlier agency overwrite the current agency query', async () => {
        let finishAgencyOne: (draft: AgencyLegalDraft) => void = () => undefined;
        const agencyOneSave = new Promise<AgencyLegalDraft>((resolve) => {
            finishAgencyOne = resolve;
        });
        const agencyOne = imprintDraft('agency-one:0');
        const agencyTwo = { ...imprintDraft('agency-two:0'), content: { de: '<p>Agentur zwei</p>' } };
        vi.mocked(getAgencyLegalDraft).mockResolvedValueOnce(agencyOne).mockResolvedValueOnce(agencyTwo);
        vi.mocked(putAgencyLegalDraft).mockImplementationOnce(() => agencyOneSave);
        const { result, rerender } = renderHook(({ agencyId }) => useAgencyLegalDraft(agencyId, 'IMPRINT', true), {
            initialProps: { agencyId: 1 },
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(agencyOne));
        const pendingSave = result.current.save({ content: { de: '<p>Bearbeitet</p>' }, revision: agencyOne.revision });

        rerender({ agencyId: 2 });
        await waitFor(() => expect(result.current.draft).toEqual(agencyTwo));
        finishAgencyOne({ ...agencyOne, revision: 'agency-one:1' });
        await act(async () => pendingSave);

        expect(result.current.draft).toEqual(agencyTwo);
        expect(result.current.hasConflict).toBe(false);
    });

    it('ignores a late conflict refresh after the kind changes', async () => {
        let finishOldRefresh: (draft: AgencyLegalDraft) => void = () => undefined;
        const oldRefresh = new Promise<AgencyLegalDraft>((resolve) => {
            finishOldRefresh = resolve;
        });
        const oldDpp = dppDraft();
        const imprint = imprintDraft();
        vi.mocked(getAgencyLegalDraft)
            .mockResolvedValueOnce(oldDpp)
            .mockImplementationOnce(() => oldRefresh)
            .mockResolvedValueOnce(imprint);
        vi.mocked(putAgencyLegalDraft).mockRejectedValue(new Error(FETCH_ERRORS.CONFLICT));
        const { result, rerender } = renderHook(({ kind }) => useAgencyLegalDraft(8, kind, true), {
            initialProps: { kind: 'DPP' as const },
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(oldDpp));
        const failedSave = result.current.save({ content: { de: '<p>Bearbeitet</p>' }, revision: oldDpp.revision });
        await waitFor(() => expect(result.current.conflictRefreshing).toBe(true));

        rerender({ kind: 'IMPRINT' as const });
        await waitFor(() => expect(result.current.draft).toEqual(imprint));
        finishOldRefresh({ ...oldDpp, revision: 'dpp-id:1' });
        await act(async () => expect(failedSave).rejects.toThrow(FETCH_ERRORS.CONFLICT));

        expect(result.current.draft).toEqual(imprint);
        expect(result.current.hasConflict).toBe(false);
    });

    it('does not let an A-to-B-to-A late save overwrite the new A generation', async () => {
        let finishOldA: (draft: AgencyLegalDraft) => void = () => undefined;
        const oldASave = new Promise<AgencyLegalDraft>((resolve) => {
            finishOldA = resolve;
        });
        const oldA = imprintDraft('agency-a:0');
        const agencyB = { ...imprintDraft('agency-b:0'), content: { de: '<p>B</p>' } };
        const newA = { ...imprintDraft('agency-a:2'), content: { de: '<p>Neues A</p>' } };
        vi.mocked(getAgencyLegalDraft)
            .mockResolvedValueOnce(oldA)
            .mockResolvedValueOnce(agencyB)
            .mockResolvedValueOnce(newA);
        vi.mocked(putAgencyLegalDraft).mockImplementationOnce(() => oldASave);
        const { result, rerender } = renderHook(({ agencyId }) => useAgencyLegalDraft(agencyId, 'IMPRINT', true), {
            initialProps: { agencyId: 10 },
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.draft).toEqual(oldA));
        const pendingOldSave = result.current.save({ content: { de: '<p>Altes A</p>' }, revision: oldA.revision });

        rerender({ agencyId: 11 });
        await waitFor(() => expect(result.current.draft).toEqual(agencyB));
        rerender({ agencyId: 10 });
        await waitFor(() => expect(result.current.draft).toEqual(newA));

        finishOldA({ ...oldA, content: { de: '<p>Verspätetes A</p>' }, revision: 'agency-a:1' });
        await act(async () => pendingOldSave);

        expect(result.current.draft).toEqual(newA);
    });

    it('keeps the saved draft when a read was still in flight', async () => {
        // A background read started before the write answers after it. Without
        // cancelling it first, the pre-save revision lands back in the cache and the
        // next save conflicts although this one succeeded.
        let releaseRead: (value: AgencyLegalDraft) => void = () => undefined;
        const pendingRead = new Promise<AgencyLegalDraft>((resolve) => {
            releaseRead = resolve;
        });
        const saved = { ...dppDraft('dpp-id:2'), content: { de: '<p>Gespeichert</p>' } };
        vi.mocked(getAgencyLegalDraft).mockReturnValueOnce(pendingRead);
        vi.mocked(putAgencyLegalDraft).mockResolvedValueOnce(saved);

        const { result } = renderHook(() => useAgencyLegalDraft(7, 'DPP', true), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.save({ content: { de: '<p>Gespeichert</p>' }, revision: 'dpp-id:1' });
        });

        await act(async () => {
            releaseRead({ ...dppDraft('dpp-id:1'), content: { de: '<p>Veraltet</p>' } });
            await pendingRead;
        });

        await waitFor(() => expect(result.current.draft).toEqual(saved));
    });

    it('keeps a discarded draft gone when a read was still in flight', async () => {
        let releaseRead: (value: AgencyLegalDraft) => void = () => undefined;
        const pendingRead = new Promise<AgencyLegalDraft>((resolve) => {
            releaseRead = resolve;
        });
        vi.mocked(getAgencyLegalDraft).mockReturnValueOnce(pendingRead);
        vi.mocked(deleteAgencyLegalDraft).mockResolvedValueOnce(undefined);

        const { result } = renderHook(() => useAgencyLegalDraft(7, 'DPP', true), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.discard('dpp-id:1');
        });

        await act(async () => {
            releaseRead(dppDraft('dpp-id:1'));
            await pendingRead;
        });

        await waitFor(() => expect(result.current.draft).toBeNull());
    });
});
