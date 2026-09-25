import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    useAgencyLegalProposalInbox,
    useHasUnreadLegalProposals,
    useTenantLegalProposalInbox,
} from './useLegalProposalInbox';
import { tenantLegalDraftKey } from './useTenantLegalDraft';
import { agencyLegalDraftKey } from './useAgencyLegalDraft';

const api = vi.hoisted(() => ({
    getTenantLegalProposals: vi.fn(),
    getTenantLegalDraftArchives: vi.fn(),
    adoptTenantLegalProposal: vi.fn(),
    dismissTenantLegalProposal: vi.fn(),
    getAgencyLegalProposals: vi.fn(),
    getAgencyLegalDraftArchives: vi.fn(),
    adoptAgencyLegalProposal: vi.fn(),
    dismissAgencyLegalProposal: vi.fn(),
}));

vi.mock('../../../../api/tenant/legalProposals', () => ({
    getTenantLegalProposals: api.getTenantLegalProposals,
    getTenantLegalDraftArchives: api.getTenantLegalDraftArchives,
    adoptTenantLegalProposal: api.adoptTenantLegalProposal,
    dismissTenantLegalProposal: api.dismissTenantLegalProposal,
}));
vi.mock('../../../../api/agency/legalProposals', () => ({
    getAgencyLegalProposals: api.getAgencyLegalProposals,
    getAgencyLegalDraftArchives: api.getAgencyLegalDraftArchives,
    adoptAgencyLegalProposal: api.adoptAgencyLegalProposal,
    dismissAgencyLegalProposal: api.dismissAgencyLegalProposal,
}));

const setup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
};

const tenantProposal = (id: number, status: string, createdAt: string) => ({
    id,
    recipientTenantId: 7,
    kind: 'IMPRINT',
    content: { de: `<p>${id}</p>` },
    status,
    revision: `${id}:0`,
    sourceRevision: '9:2',
    distributionId: `d-${id}`,
    createdAt,
});

describe('useTenantLegalProposalInbox', () => {
    beforeEach(() => Object.values(api).forEach((mock) => mock.mockReset()));

    it('offers the newest adoptable template, never an adopted or superseded one', async () => {
        api.getTenantLegalProposals.mockResolvedValue([
            tenantProposal(3, 'ADOPTED', '2026-09-25T12:00:00'),
            tenantProposal(2, 'DISMISSED', '2026-09-24T12:00:00'),
            tenantProposal(1, 'SUPERSEDED', '2026-09-20T12:00:00'),
        ]);
        api.getTenantLegalDraftArchives.mockResolvedValue([]);
        const { wrapper } = setup();
        const { result } = renderHook(() => useTenantLegalProposalInbox(7, 'IMPRINT', true), { wrapper });
        await waitFor(() => expect(result.current.state).toBe('available'));
        expect(result.current.current).toMatchObject({ id: 2, status: 'DISMISSED', revision: '2:0' });
        expect(api.getTenantLegalProposals).toHaveBeenCalledWith(7, 'IMPRINT');
    });

    it('an older backend without the inbox is "unsupported", not "nothing received"', async () => {
        api.getTenantLegalProposals.mockResolvedValue(null);
        const { wrapper } = setup();
        const { result } = renderHook(() => useTenantLegalProposalInbox(7, 'IMPRINT', true), { wrapper });
        await waitFor(() => expect(result.current.state).toBe('unsupported'));
        expect(result.current.current).toBeUndefined();
    });

    it('adopting puts the returned draft into the draft cache and refreshes the inbox', async () => {
        api.getTenantLegalProposals.mockResolvedValue([tenantProposal(2, 'PENDING', '2026-09-24T12:00:00')]);
        api.getTenantLegalDraftArchives.mockResolvedValue([]);
        const draft = { kind: 'IMPRINT', content: { de: '<p>2</p>' }, revision: '12:0', updatedAt: '' };
        api.adoptTenantLegalProposal.mockResolvedValue(draft);
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useTenantLegalProposalInbox(7, 'IMPRINT', true), { wrapper });
        await waitFor(() => expect(result.current.current).toBeDefined());
        await act(async () => {
            await result.current.adopt(result.current.current!, 'ARCHIVE_AND_REPLACE', '11:4');
        });
        expect(api.adoptTenantLegalProposal).toHaveBeenCalledWith(7, 2, {
            mode: 'ARCHIVE_AND_REPLACE',
            expectedProposalRevision: '2:0',
            expectedDraftRevision: '11:4',
        });
        expect(client.getQueryData(tenantLegalDraftKey(7, 'IMPRINT'))).toEqual(draft);
        expect(api.getTenantLegalProposals).toHaveBeenCalledTimes(2);
    });

    it('never asks for the platform (tenant 0) inbox', () => {
        const { wrapper } = setup();
        const { result } = renderHook(() => useTenantLegalProposalInbox(0, 'IMPRINT', true), { wrapper });
        expect(result.current.state).toBe('unsupported');
        expect(api.getTenantLegalProposals).not.toHaveBeenCalled();
    });
});

describe('useAgencyLegalProposalInbox', () => {
    beforeEach(() => Object.values(api).forEach((mock) => mock.mockReset()));

    it('carries the Fachbereich impact and unwraps the adopted draft', async () => {
        api.getAgencyLegalProposals.mockResolvedValue([
            {
                id: 5001,
                recipientAgencyId: 101,
                kind: 'DPP',
                content: { de: '<p>Träger</p>' },
                consentText: { de: 'Satz' },
                status: 'PENDING',
                revision: '5001:0',
                createdAt: '2026-09-25T14:31:07',
                departmentImpact: { affected: 3, notAffected: 1 },
            },
        ]);
        api.getAgencyLegalDraftArchives.mockResolvedValue([
            { id: 9, content: { de: 'alt' }, draftSavedAt: 'a', archivedAt: 'b' },
        ]);
        const draft = { kind: 'DPP', content: { de: '<p>Träger</p>' }, consentText: {}, revision: 'x:4', savedAt: '' };
        api.adoptAgencyLegalProposal.mockResolvedValue({ draft, proposal: {}, departmentImpact: {} });
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useAgencyLegalProposalInbox(101, 'DPP', true), { wrapper });
        await waitFor(() => expect(result.current.archives).toHaveLength(1));
        expect(result.current.current).toMatchObject({
            consent: { de: 'Satz' },
            departmentImpact: { affected: 3, notAffected: 1 },
        });
        let adopted;
        await act(async () => {
            adopted = await result.current.adopt(result.current.current!, 'CREATE_IF_EMPTY');
        });
        expect(adopted).toEqual(draft);
        expect(api.adoptAgencyLegalProposal).toHaveBeenCalledWith(101, 5001, {
            mode: 'CREATE_IF_EMPTY',
            expectedProposalRevision: '5001:0',
        });
        expect(client.getQueryData(agencyLegalDraftKey(101, 'DPP'))).toEqual(draft);
    });
});

describe('useHasUnreadLegalProposals', () => {
    beforeEach(() => Object.values(api).forEach((mock) => mock.mockReset()));

    it('marks the tab only for an unread (PENDING) template', async () => {
        api.getAgencyLegalProposals.mockResolvedValue([{ status: 'DISMISSED' }, { status: 'PENDING' }]);
        const { wrapper } = setup();
        const { result } = renderHook(() => useHasUnreadLegalProposals('agency', '101', true), { wrapper });
        await waitFor(() => expect(result.current).toBe(true));
        expect(api.getAgencyLegalProposals).toHaveBeenCalledWith(101);

        api.getTenantLegalProposals.mockResolvedValue([{ status: 'DISMISSED' }]);
        const tenant = renderHook(() => useHasUnreadLegalProposals('tenant', 7, true), { wrapper: setup().wrapper });
        await waitFor(() => expect(api.getTenantLegalProposals).toHaveBeenCalledWith(7));
        expect(tenant.result.current).toBe(false);
    });
});
