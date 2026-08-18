import { agencyEndpointBase, tenantAdminEndpoint } from '../../appConfig';
import { LegalTextVersion, LegalVersionScope } from '../../types/legalVersion';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/**
 * Client for the generic legal-text version history (ADR-021 decision 3).
 *
 * The agency and department URLs are the ones ORISO-AgencyService#256 serves: one
 * `legal-versions` collection per level, with the document selected by `?kind=`
 * rather than by a path segment per document. This module is deliberately the ONLY
 * place that knows the URLs.
 *
 * The Träger level is NOT covered by that contract — #256 states levels 1-2 live in
 * ORISO-TenantService and their history has yet to be built there (its known gap 2).
 * The tenant URL below therefore still anticipates a shape rather than matching one,
 * and until it exists the request 404s and the hook degrades to "no history".
 */
export const legalTextVersionsUrl = (scope: LegalVersionScope): string => {
    switch (scope.level) {
        case 'tenant':
            // Träger level lives in the TenantService, next to the DPA history it copies.
            return `${tenantAdminEndpoint}/${scope.tenantId}/legal-versions?kind=${scope.kind}`;
        case 'agency':
            return `${agencyEndpointBase}/${scope.agencyId}/legal-versions?kind=${scope.kind}`;
        case 'department':
        default:
            return `${agencyEndpointBase}/${scope.agencyId}/topics/${scope.topicId}/legal-versions?kind=${scope.kind}`;
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
 * The one failure folded into "empty" is 404: the Träger level has no endpoint at all,
 * and ORISO-AgencyService#256 is merged but not yet deployed everywhere, so a level
 * legitimately has no history yet and an error banner on four cards would be noise
 * about a feature that has not reached that environment.
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
