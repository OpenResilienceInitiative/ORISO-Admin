import { agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import type { AgencyLegalDraft, AgencyLegalDraftKind } from './legalDrafts';
import type {
    LegalProposalAdoptRequest,
    LegalProposalStatus,
    TenantLegalProposalAudience,
} from '../tenant/legalProposals';

/**
 * What publishing at agency level would reach (API note 3.3): `affected` Fachbereiche follow the
 * agency text, `notAffected` have published their own (forked, ADR-014).
 */
export interface LegalDepartmentImpact {
    affected: number;
    notAffected: number;
    notAffectedTopicIds?: number[];
}

/** A template the Träger forwarded to one Beratungsstelle (ORISO-AgencyService#303). */
export interface AgencyLegalProposal {
    id: number;
    recipientAgencyId: number;
    kind: AgencyLegalDraftKind;
    content: Record<string, string>;
    consentText?: Record<string, string>;
    status: LegalProposalStatus;
    revision: string;
    source?: 'DRAFT' | 'PUBLISHED';
    sourceRevision?: string;
    distributionId?: string;
    audience?: TenantLegalProposalAudience;
    createdBy?: string;
    createdAt: string;
    decidedBy?: string | null;
    decidedAt?: string | null;
    supersededByProposalId?: number | null;
    supersededAt?: string | null;
    departmentImpact?: LegalDepartmentImpact;
}

export interface AgencyLegalDraftArchive {
    id: number;
    agencyId: number;
    kind: AgencyLegalDraftKind;
    draftRevision: string;
    content: Record<string, string>;
    consentText?: Record<string, string>;
    draftSavedAt: string;
    originProposalId?: number | null;
    replacedByProposalId?: number | null;
    archivedBy?: string;
    archivedAt: string;
}

export interface AgencyLegalProposalAdoption {
    draft: AgencyLegalDraft;
    proposal?: AgencyLegalProposal;
    /** Present only for `ARCHIVE_AND_REPLACE`. */
    archivedDraft?: AgencyLegalDraftArchive;
    departmentImpact?: LegalDepartmentImpact;
}

const proposalsUrl = (agencyId: number) => `${agencyEndpointBase}/${agencyId}/legal-proposals`;

const hasMessage = (error: unknown, code: string) => error instanceof Error && error.message === code;

/** Newest first. `null` = this AgencyService has no inbox yet (404) — not "nothing received". */
export const getAgencyLegalProposals = async (
    agencyId: number,
    kind?: AgencyLegalDraftKind,
): Promise<AgencyLegalProposal[] | null> => {
    try {
        const list = await fetchData({
            url: `${proposalsUrl(agencyId)}${kind ? `?kind=${kind}` : ''}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
        return Array.isArray(list) ? (list as AgencyLegalProposal[]) : [];
    } catch (error) {
        if (hasMessage(error, FETCH_ERRORS.NO_MATCH)) return null;
        throw error;
    }
};

const decisionHandling = [
    FETCH_ERRORS.BAD_REQUEST,
    FETCH_ERRORS.FORBIDDEN,
    FETCH_ERRORS.CONFLICT,
    FETCH_ERRORS.NO_MATCH,
    FETCH_ERRORS.CATCH_ALL_SILENT,
    FETCH_SUCCESS.CONTENT,
];

/** "Verwerfen": the offer stays adoptable, the Beratungsstelle's own draft is untouched. */
export const dismissAgencyLegalProposal = (agencyId: number, proposalId: number, expectedProposalRevision: string) =>
    fetchData({
        url: `${proposalsUrl(agencyId)}/${proposalId}/dismiss`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        bodyData: JSON.stringify({ expectedProposalRevision }),
        responseHandling: decisionHandling,
    }) as Promise<AgencyLegalProposal>;

/** "Vorlage übernehmen": copies the offer into the agency-wide draft. Publishes nothing. */
export const adoptAgencyLegalProposal = (agencyId: number, proposalId: number, request: LegalProposalAdoptRequest) =>
    fetchData({
        url: `${proposalsUrl(agencyId)}/${proposalId}/adopt`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        bodyData: JSON.stringify(request),
        responseHandling: decisionHandling,
    }) as Promise<AgencyLegalProposalAdoption>;

/** The drafts an adoption replaced, newest first; a missing collection reads as none. */
export const getAgencyLegalDraftArchives = async (
    agencyId: number,
    kind: AgencyLegalDraftKind,
): Promise<AgencyLegalDraftArchive[]> => {
    try {
        const list = await fetchData({
            url: `${agencyEndpointBase}/${agencyId}/legal-draft-archives?kind=${kind}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
        return Array.isArray(list) ? (list as AgencyLegalDraftArchive[]) : [];
    } catch (error) {
        if (hasMessage(error, FETCH_ERRORS.NO_MATCH)) return [];
        throw error;
    }
};
