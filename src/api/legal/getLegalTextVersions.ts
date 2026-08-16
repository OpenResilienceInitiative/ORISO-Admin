import { agencyEndpointBase, tenantAdminEndpoint } from '../../appConfig';
import { LegalTextVersion, LegalVersionScope } from '../../types/legalVersion';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Client for the generic legal-text version history (ADR-021 decision 3).
 *
 * TODO(#250): the endpoints are being built in ORISO-AgencyService on branch
 * `feat/legal-text-versioning-250` (PR against
 * OpenResilienceInitiative/ORISO-AgencyService#250). The paths and the DTO below
 * mirror the AVV blueprint (`GET /tenantadmin/{id}/dpa/versions`,
 * `DpaVersionDTO { activationDate, content }`) extended by the legal-text kind and
 * the optional `consentText` field. This module is deliberately the ONLY place
 * that knows the URLs, so aligning with the merged backend contract is a one-file
 * change. Until the endpoints exist the hook degrades to "no history" — see
 * `useLegalTextVersions`.
 */
export const legalTextVersionsUrl = (scope: LegalVersionScope): string => {
    switch (scope.level) {
        case 'tenant':
            // Träger level lives in the TenantService, next to the DPA history it copies.
            return `${tenantAdminEndpoint}/${scope.tenantId}/legal/${scope.kind}/versions`;
        case 'agency':
            return `${agencyEndpointBase}/${scope.agencyId}/${scope.kind}/versions`;
        case 'department':
        default:
            return `${agencyEndpointBase}/${scope.agencyId}/topics/${scope.topicId}/${scope.kind}/versions`;
    }
};

/**
 * Published versions of one legal text, newest first.
 *
 * Errors are silent in the sense that they raise no global toast and never bounce
 * the admin out of the settings deck — but they REJECT. A history that failed to
 * load and a history that is genuinely empty are different statements, and an
 * admin answering "which policy was in force in March" must not be told "none"
 * because a 403 or a 500 was swallowed.
 *
 * The one failure folded into "empty" is 404: until the generic endpoints of #250
 * are deployed every level legitimately has no history, and an error banner on
 * four cards would be noise about a feature that has not shipped yet.
 */
export const getLegalTextVersions = (scope: LegalVersionScope): Promise<LegalTextVersion[]> =>
    (
        fetchData({
            url: legalTextVersionsUrl(scope),
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT],
        }) as Promise<LegalTextVersion[]>
    ).catch((error: unknown) => {
        if (error instanceof Error && error.message === FETCH_ERRORS.NO_MATCH) {
            return [] as LegalTextVersion[];
        }
        throw error;
    });
