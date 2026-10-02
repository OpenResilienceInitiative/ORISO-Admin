import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    adoptTenantLegalProposal,
    dismissTenantLegalProposal,
    getTenantLegalDraftArchives,
    getTenantLegalProposals,
    LegalProposalAdoptionMode,
    LegalProposalStatus,
} from '../../../../api/tenant/legalProposals';
import type { TenantLegalDraft, TenantLegalDraftKind } from '../../../../api/tenant/legalDrafts';
import {
    adoptAgencyLegalProposal,
    dismissAgencyLegalProposal,
    getAgencyLegalDraftArchives,
    getAgencyLegalProposals,
    LegalDepartmentImpact,
} from '../../../../api/agency/legalProposals';
import type { AgencyLegalDraft, AgencyLegalDraftKind } from '../../../../api/agency/legalDrafts';
import { tenantLegalDraftKey } from './useTenantLegalDraft';
import { agencyLegalDraftKey } from './useAgencyLegalDraft';

export type LegalInboxLevel = 'tenant' | 'agency';

/** One received template, the same for both rungs (platform → Träger, Träger → Beratungsstelle). */
export interface LegalTemplateProposal {
    id: number;
    status: LegalProposalStatus;
    revision: string;
    createdAt: string;
    content: Record<string, string>;
    consent?: Record<string, string>;
    departmentImpact?: LegalDepartmentImpact;
}

/** A draft an adoption replaced — kept readable so "replace" never means "lost". */
export interface LegalTemplateArchive {
    id: number;
    content: Record<string, string>;
    draftSavedAt: string;
    archivedAt: string;
}

export type LegalInboxState = 'loading' | 'available' | 'unsupported' | 'unavailable';

export interface LegalTemplateInbox<TDraft> {
    state: LegalInboxState;
    /** The newest template that can still be adopted (PENDING or DISMISSED). */
    current?: LegalTemplateProposal;
    archives: LegalTemplateArchive[];
    dismiss: (proposal: LegalTemplateProposal) => Promise<void>;
    adopt: (
        proposal: LegalTemplateProposal,
        mode: LegalProposalAdoptionMode,
        expectedDraftRevision?: string,
    ) => Promise<TDraft>;
}

export type TenantTemplateInbox = LegalTemplateInbox<TenantLegalDraft>;
export type AgencyTemplateInbox = LegalTemplateInbox<AgencyLegalDraft>;

export const legalProposalsKey = (level: LegalInboxLevel, ownerId: number | string) =>
    ['legal-proposals', level, String(ownerId)] as const;

const ADOPTABLE: LegalProposalStatus[] = ['PENDING', 'DISMISSED'];

/** Lists are newest first; sort again anyway so a server that forgets does not hide a new offer. */
const newestAdoptable = (proposals: LegalTemplateProposal[] | null | undefined) =>
    [...(proposals ?? [])]
        .filter((proposal) => ADOPTABLE.includes(proposal.status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)[0];

interface InboxSource<TDraft> {
    level: LegalInboxLevel;
    ownerId: number | string;
    kind: string;
    list: () => Promise<LegalTemplateProposal[] | null>;
    archives: () => Promise<LegalTemplateArchive[]>;
    dismiss: (proposal: LegalTemplateProposal) => Promise<unknown>;
    adopt: (
        proposal: LegalTemplateProposal,
        mode: LegalProposalAdoptionMode,
        expectedDraftRevision?: string,
    ) => Promise<TDraft>;
    /** Puts the adopted draft into the draft query, so the editor and the cache agree. */
    draftKey: readonly unknown[];
}

const adoptRequest = (proposal: LegalTemplateProposal, mode: LegalProposalAdoptionMode, draftRevision?: string) => ({
    mode,
    expectedProposalRevision: proposal.revision,
    ...(mode === 'ARCHIVE_AND_REPLACE' && draftRevision ? { expectedDraftRevision: draftRevision } : {}),
});

const useInbox = <TDraft>(source: InboxSource<TDraft>, enabled: boolean): LegalTemplateInbox<TDraft> => {
    const queryClient = useQueryClient();
    const baseKey = legalProposalsKey(source.level, source.ownerId);
    const proposals = useQuery({
        queryKey: [...baseKey, source.kind],
        queryFn: source.list,
        enabled,
        retry: false,
    });
    const archives = useQuery({
        queryKey: [...baseKey, source.kind, 'archives'],
        queryFn: source.archives,
        enabled: enabled && proposals.data !== null && proposals.isSuccess,
        retry: false,
    });

    let state: LegalInboxState = 'available';
    if (!enabled || proposals.data === null) state = 'unsupported';
    else if (proposals.isLoading) state = 'loading';
    else if (proposals.isError) state = 'unavailable';

    const refresh = () => queryClient.invalidateQueries({ queryKey: baseKey });

    return {
        state,
        current: state === 'available' ? newestAdoptable(proposals.data) : undefined,
        archives: archives.data ?? [],
        dismiss: async (proposal) => {
            try {
                await source.dismiss(proposal);
            } finally {
                await refresh();
            }
        },
        adopt: async (proposal, mode, expectedDraftRevision) => {
            try {
                const draft = await source.adopt(proposal, mode, expectedDraftRevision);
                queryClient.setQueryData(source.draftKey, draft);
                return draft;
            } finally {
                await refresh();
            }
        },
    };
};

/** Templates the platform sent to this Träger (TenantService#262/#266). */
export const useTenantLegalProposalInbox = (
    tenantId: number | string,
    kind: TenantLegalDraftKind,
    enabled: boolean,
): TenantTemplateInbox => {
    const source = useMemo<InboxSource<TenantLegalDraft>>(
        () => ({
            level: 'tenant',
            ownerId: tenantId,
            kind,
            list: async () =>
                (await getTenantLegalProposals(tenantId, kind))?.map((proposal) => ({
                    id: proposal.id,
                    status: proposal.status,
                    revision: proposal.revision,
                    createdAt: proposal.createdAt,
                    content: proposal.content ?? {},
                    consent: proposal.privacyConsent,
                })) ?? null,
            archives: async () =>
                (await getTenantLegalDraftArchives(tenantId, kind)).map((archive) => ({
                    id: archive.id,
                    content: archive.content ?? {},
                    draftSavedAt: archive.draftSavedAt,
                    archivedAt: archive.archivedAt,
                })),
            dismiss: (proposal) => dismissTenantLegalProposal(tenantId, proposal.id, proposal.revision),
            adopt: (proposal, mode, draftRevision) =>
                adoptTenantLegalProposal(tenantId, proposal.id, adoptRequest(proposal, mode, draftRevision)),
            draftKey: tenantLegalDraftKey(tenantId, kind),
        }),
        [tenantId, kind],
    );
    return useInbox(source, enabled && String(tenantId) !== '' && String(tenantId) !== '0');
};

/** Templates this Beratungsstelle's Träger forwarded (AgencyService#303). */
export const useAgencyLegalProposalInbox = (
    agencyId: number,
    kind: AgencyLegalDraftKind,
    enabled: boolean,
): AgencyTemplateInbox => {
    const source = useMemo<InboxSource<AgencyLegalDraft>>(
        () => ({
            level: 'agency',
            ownerId: agencyId,
            kind,
            list: async () =>
                (await getAgencyLegalProposals(agencyId, kind))?.map((proposal) => ({
                    id: proposal.id,
                    status: proposal.status,
                    revision: proposal.revision,
                    createdAt: proposal.createdAt,
                    content: proposal.content ?? {},
                    consent: proposal.consentText,
                    departmentImpact: proposal.departmentImpact,
                })) ?? null,
            archives: async () =>
                (await getAgencyLegalDraftArchives(agencyId, kind)).map((archive) => ({
                    id: archive.id,
                    content: archive.content ?? {},
                    draftSavedAt: archive.draftSavedAt,
                    archivedAt: archive.archivedAt,
                })),
            dismiss: (proposal) => dismissAgencyLegalProposal(agencyId, proposal.id, proposal.revision),
            adopt: async (proposal, mode, draftRevision) =>
                (await adoptAgencyLegalProposal(agencyId, proposal.id, adoptRequest(proposal, mode, draftRevision)))
                    .draft,
            draftKey: agencyLegalDraftKey(agencyId, kind),
        }),
        [agencyId, kind],
    );
    return useInbox(source, enabled && Number.isFinite(agencyId) && agencyId > 0);
};

/** Whether any document of this owner has an unread (PENDING) template — the tab marker. */
export const useHasUnreadLegalProposals = (
    level: LegalInboxLevel,
    ownerId: number | string | null | undefined,
    enabled: boolean,
) => {
    const usable = enabled && ownerId != null && String(ownerId) !== '' && Number(ownerId) > 0;
    const query = useQuery({
        queryKey: [...legalProposalsKey(level, ownerId ?? ''), 'any'],
        queryFn: async () => {
            const list =
                level === 'tenant'
                    ? await getTenantLegalProposals(ownerId as number | string)
                    : await getAgencyLegalProposals(Number(ownerId));
            return (list ?? []).some((proposal) => proposal.status === 'PENDING');
        },
        enabled: usable,
        retry: false,
        staleTime: 60_000,
    });
    return usable && query.data === true;
};
