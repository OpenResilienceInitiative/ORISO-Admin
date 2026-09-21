import { agencyLegalProposalDistributionsEndpoint, tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import type { TenantLegalDraftKind } from './legalDrafts';

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

export interface DistributeAgencyLegalProposal {
    requestKey: string;
    kind: TenantLegalDraftKind;
    /** The Träger's saved draft revision (`id:version`) the Beratungsstellen receive. */
    sourceRevision: string;
    audience: TenantLegalProposalAudience;
    /** Required for `SELECTED`, ignored for `ALL`. Only the Träger's own Beratungsstellen. */
    agencyIds?: number[];
}

export interface AgencyLegalProposalDistribution {
    requestKey: string;
    recipientAgencyIds: number[];
}

/**
 * Träger → Beratungsstellen: the same step one rung down. Contract proposed in
 * OpenResilienceInitiative/ORISO-AgencyService#303 and mirrored on the platform call above,
 * so both rungs behave identically. Not implemented server-side yet.
 */
export const distributeAgencyLegalProposal = (request: DistributeAgencyLegalProposal) =>
    fetchData({
        url: agencyLegalProposalDistributionsEndpoint,
        method: FETCH_METHODS.POST,
        skipAuth: false,
        bodyData: JSON.stringify(request),
        responseHandling: [
            FETCH_ERRORS.CONFLICT,
            FETCH_ERRORS.NO_MATCH,
            FETCH_ERRORS.CATCH_ALL_SILENT,
            FETCH_SUCCESS.CONTENT,
        ],
    }) as Promise<AgencyLegalProposalDistribution>;

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
