import { agencyLegalProposalDistributionsEndpoint, tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import type { TenantLegalDraft, TenantLegalDraftKind } from './legalDrafts';

/** Who receives a platform template: every current Träger, or an explicit list. */
export type TenantLegalProposalAudience = 'ALL' | 'SELECTED';

export interface DistributeTenantLegalProposal {
    /**
     * Idempotency key. The server answers a repeated request with the same key with the
     * distribution it already made, so a double click or a retried request never
     * creates a second proposal per recipient.
     */
    requestKey: string;
    kind: TenantLegalDraftKind;
    /** The saved draft revision (`id:version`) — never the unsaved editor content. */
    sourceRevision: string;
    audience: TenantLegalProposalAudience;
    /** Required for `SELECTED`, ignored for `ALL`. */
    tenantIds?: number[];
}

export interface TenantLegalProposalDistribution {
    requestKey: string;
    recipientTenantIds: number[];
}

/**
 * Platform → Träger: offer an exact saved platform draft revision as a template.
 * Publishes nothing — every recipient decides for itself (ORISO-TenantService#262).
 *
 * Errors keep their meaning for the caller: `CONFLICT` means the draft changed since
 * it was loaded, `NO_MATCH` that there is no saved platform draft any more.
 */
export const distributeTenantLegalProposal = (request: DistributeTenantLegalProposal) =>
    fetchData({
        url: `${tenantAdminEndpoint}/legal-proposal-distributions`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        bodyData: JSON.stringify(request),
        // POST bodies are only parsed on request; without CONTENT the caller would get the raw
        // Response and could not tell the admin how many Träger received the template.
        responseHandling: [
            FETCH_ERRORS.CONFLICT,
            FETCH_ERRORS.NO_MATCH,
            FETCH_ERRORS.CATCH_ALL_SILENT,
            FETCH_SUCCESS.CONTENT,
        ],
    }) as Promise<TenantLegalProposalDistribution>;

export const newDistributionRequestKey = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Which Träger text goes down: the saved draft (default) or the text in force (API note 3.1). */
export type AgencyLegalProposalSource = 'DRAFT' | 'PUBLISHED';

export interface DistributeAgencyLegalProposal {
    requestKey: string;
    /** `PRIVACY` is accepted by AgencyService as an alias of `DPP`. */
    kind: TenantLegalDraftKind;
    source?: AgencyLegalProposalSource;
    /** `DRAFT`: the Träger draft revision shown in the dialog. `PUBLISHED`: `"version:" + id`. */
    sourceRevision: string;
    audience: TenantLegalProposalAudience;
    /** Required for `SELECTED`, empty for `ALL`. Only the Träger's own Beratungsstellen. */
    agencyIds?: number[];
}

export interface AgencyLegalProposalDistribution {
    distributionId?: string;
    requestKey: string;
    kind?: 'DPP' | 'IMPRINT';
    source?: AgencyLegalProposalSource;
    sourceRevision?: string;
    audience?: TenantLegalProposalAudience;
    /** "How many received it" is the length of this list. */
    recipientAgencyIds: number[];
    createdAt?: string;
    proposals?: unknown[];
}

/**
 * Träger → Beratungsstellen: the same step one rung down (ORISO-AgencyService#303).
 * Publishes nothing. `BAD_REQUEST` = no Beratungsstelle / unknown id, `FORBIDDEN` = not a
 * Träger admin, `CONFLICT` = the draft changed since the dialog loaded, `NO_MATCH` = no saved draft.
 */
export const distributeAgencyLegalProposal = ({ source = 'DRAFT', ...request }: DistributeAgencyLegalProposal) =>
    fetchData({
        url: agencyLegalProposalDistributionsEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        bodyData: JSON.stringify({
            requestKey: request.requestKey,
            kind: request.kind,
            source,
            sourceRevision: request.sourceRevision,
            audience: request.audience,
            ...(request.agencyIds ? { agencyIds: request.agencyIds } : {}),
        }),
        responseHandling: [
            FETCH_ERRORS.BAD_REQUEST,
            FETCH_ERRORS.FORBIDDEN,
            FETCH_ERRORS.CONFLICT,
            FETCH_ERRORS.NO_MATCH,
            FETCH_ERRORS.CATCH_ALL_SILENT,
            FETCH_SUCCESS.CONTENT,
        ],
    }) as Promise<AgencyLegalProposalDistribution>;

/** TenantService says PRIVACY, AgencyService says DPP for the same document. */
export const toAgencyLegalKind = (kind: TenantLegalDraftKind): 'DPP' | 'IMPRINT' =>
    kind === 'PRIVACY' ? 'DPP' : 'IMPRINT';

/** One template version the platform has sent: the snapshot every recipient received. */
export interface TenantLegalTemplateVersion {
    distributionId: string;
    /** The platform draft revision (`id:version`) that was sent. */
    sourceRevision: string;
    createdAt: string;
    recipientCount: number;
    content: Record<string, string>;
    privacyConsent?: Record<string, string>;
}

/**
 * The platform's sent template versions of one document, newest first — what the
 * "Vorlagen" section of the version menu lists. `NO_MATCH` stays distinguishable so
 * a TenantService without this collection reads as "not available yet", not as
 * "nothing sent".
 */
export const getTenantLegalTemplateHistory = (kind: TenantLegalDraftKind) =>
    fetchData({
        url: `${tenantAdminEndpoint}/legal-proposal-distributions?kind=${kind}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
    }) as Promise<TenantLegalTemplateVersion[]>;

interface AgencyLegalTemplateVersionDTO {
    distributionId: string;
    sourceRevision: string;
    createdAt: string;
    recipientCount?: number;
    recipientAgencyIds?: number[];
    content?: Record<string, string>;
    consentText?: Record<string, string>;
}

/**
 * What the Träger has already forwarded to its Beratungsstellen, newest first (API note 3.2),
 * in the same shape as the platform's list so the version menu treats both rungs alike.
 */
export const getAgencyLegalTemplateHistory = async (
    kind: TenantLegalDraftKind,
): Promise<TenantLegalTemplateVersion[]> => {
    const versions = (await fetchData({
        url: `${agencyLegalProposalDistributionsEndpoint}?kind=${toAgencyLegalKind(kind)}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
    })) as AgencyLegalTemplateVersionDTO[];
    return (Array.isArray(versions) ? versions : []).map((version) => ({
        distributionId: version.distributionId,
        sourceRevision: version.sourceRevision,
        createdAt: version.createdAt,
        recipientCount: version.recipientCount ?? version.recipientAgencyIds?.length ?? 0,
        content: version.content ?? {},
        ...(version.consentText ? { privacyConsent: version.consentText } : {}),
    }));
};

/* ---------------------------------------------------------------------------------------- */
/* Träger inbox: templates the platform sent (ORISO-TenantService#262 / #266).              */
/* ---------------------------------------------------------------------------------------- */

/** `DISMISSED` stays adoptable; `SUPERSEDED` is read-only history. */
export type LegalProposalStatus = 'PENDING' | 'DISMISSED' | 'ADOPTED' | 'SUPERSEDED';

export type LegalProposalAdoptionMode = 'CREATE_IF_EMPTY' | 'ARCHIVE_AND_REPLACE';

export interface LegalProposalAdoptRequest {
    mode: LegalProposalAdoptionMode;
    expectedProposalRevision: string;
    /** Required for `ARCHIVE_AND_REPLACE`, forbidden for `CREATE_IF_EMPTY`. */
    expectedDraftRevision?: string;
}

export interface TenantLegalProposal {
    id: number;
    recipientTenantId: number;
    kind: TenantLegalDraftKind;
    content: Record<string, string>;
    privacyConsent?: Record<string, string>;
    status: LegalProposalStatus;
    revision: string;
    sourceRevision: string;
    sourceUpdatedAt?: string;
    distributionId: string;
    audience?: TenantLegalProposalAudience;
    createdBy?: string;
    createdAt: string;
    decidedBy?: string | null;
    decidedAt?: string | null;
    supersededByProposalId?: number | null;
    supersededAt?: string | null;
}

export interface TenantLegalDraftArchive {
    id: number;
    tenantId: number;
    kind: TenantLegalDraftKind;
    draftRevision: string;
    content: Record<string, string>;
    privacyConsent?: Record<string, string>;
    draftSavedAt: string;
    originProposalId?: number | null;
    archivedBy?: string;
    archivedAt: string;
}

const hasMessage = (error: unknown, code: string) => error instanceof Error && error.message === code;

/** Newest first. `null` = this TenantService has no inbox yet (404) — not "nothing received". */
export const getTenantLegalProposals = async (
    tenantId: number | string,
    kind?: TenantLegalDraftKind,
): Promise<TenantLegalProposal[] | null> => {
    try {
        const list = await fetchData({
            url: `${tenantAdminEndpoint}/${tenantId}/legal-proposals${kind ? `?kind=${kind}` : ''}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
        return Array.isArray(list) ? (list as TenantLegalProposal[]) : [];
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

/** "Verwerfen": acknowledges the notice. Never touches the Träger's own draft. */
export const dismissTenantLegalProposal = (
    tenantId: number | string,
    proposalId: number,
    expectedProposalRevision: string,
) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/legal-proposals/${proposalId}/dismiss`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        bodyData: JSON.stringify({ expectedProposalRevision }),
        responseHandling: decisionHandling,
    }) as Promise<TenantLegalProposal>;

/** "Vorlage übernehmen": copies the template into the Träger draft. Publishes nothing. */
export const adoptTenantLegalProposal = (
    tenantId: number | string,
    proposalId: number,
    request: LegalProposalAdoptRequest,
) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/legal-proposals/${proposalId}/adopt`,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        bodyData: JSON.stringify(request),
        responseHandling: decisionHandling,
    }) as Promise<TenantLegalDraft>;

/** The drafts an adoption replaced — where "your previous draft stays readable" points to. */
export const getTenantLegalDraftArchives = async (
    tenantId: number | string,
    kind: TenantLegalDraftKind,
): Promise<TenantLegalDraftArchive[]> => {
    try {
        const list = await fetchData({
            url: `${tenantAdminEndpoint}/${tenantId}/legal-draft-archives?kind=${kind}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
        });
        return Array.isArray(list) ? (list as TenantLegalDraftArchive[]) : [];
    } catch (error) {
        if (hasMessage(error, FETCH_ERRORS.NO_MATCH)) return [];
        throw error;
    }
};
