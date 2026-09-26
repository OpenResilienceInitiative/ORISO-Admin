import { agencyEndpointBase, tenantAdminEndpoint } from '../../appConfig';
import { LegalTextVersion, LegalVersionScope } from '../../types/legalVersion';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** A missing endpoint is different from an owner with no published versions. */
export type LegalTextVersionsResult = { state: 'available'; versions: LegalTextVersion[] } | { state: 'unsupported' };

/**
 * Client for the generic legal-text version history (ADR-021 decision 3).
 *
 * The agency and department URLs are the ones ORISO-AgencyService#256 serves: one
 * `legal-versions` collection per level, with the document selected by `?kind=`
 * rather than by a path segment per document. This module is deliberately the ONLY
 * place that knows the URLs.
 *
 * The Träger and platform levels are served by TenantService in the same shape
 * (`/tenantadmin/{id}/legal-versions`, id 0 = platform; ORISO-Admin#270, #1070).
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
 * A TenantService older than #1070 has no tenant collection, so its 404 is
 * "unsupported" rather than "never published". Other owners' 404s remain failures:
 * a routing/deployment error must not be guessed to be an empty or unsupported history.
 */
export const getLegalTextVersions = (scope: LegalVersionScope): Promise<LegalTextVersionsResult> =>
    (
        fetchData({
            url: legalTextVersionsUrl(scope),
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT],
        }) as Promise<LegalTextVersion[]>
    )
        .then((versions) => ({ state: 'available' as const, versions }))
        .catch((error: unknown) => {
            if (scope.level === 'tenant' && error instanceof Error && error.message === FETCH_ERRORS.NO_MATCH) {
                return { state: 'unsupported' as const };
            }
            throw error;
        });
