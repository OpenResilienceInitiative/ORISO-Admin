import { tenantAdminEndpoint } from '../../appConfig';
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
