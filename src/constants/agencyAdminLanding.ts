import routePathNames from '../appConfig';
import { UserRole } from '../enums/UserRole';
import type { HasRoleFn } from './caseHandoverAccess';

/**
 * A Beratungsstellen-Admin: holds `restricted-agency-admin` and no tenant-level role. The standard
 * bundle is `restricted-agency-admin` + `user-admin`. Tenant admins (and the platform admin, who is
 * a tenant admin too) keep their own landing flow; this ticket (ORISO-Admin#917) is scoped to the
 * agency-only admin.
 */
export const isAgencyScopedAdmin = (hasRole: HasRoleFn): boolean =>
    hasRole(UserRole.RestrictedAgencyAdmin) && !hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin]);

/**
 * Whether legal-text access opens the Träger legal settings (`/theme-settings/legal`). A
 * Beratungsstellen-Admin reads legal texts since #1070, but edits them on its own agency's legal tab;
 * the Träger page reads Träger drafts, which the server denies, so it would end on access-denied.
 */
export const canOpenTenantLegalSettings = (canReadLegalText: boolean, hasRole: HasRoleFn): boolean =>
    canReadLegalText && !isAgencyScopedAdmin(hasRole);

/**
 * Where an agency-scoped admin lands: with exactly one assigned agency straight into that agency's
 * settings, otherwise on the (server-side filtered) Beratungsstellen list.
 *
 * `agencies` is the `agencies` array of `GET /service/users/data`; anything that is not a list of
 * exactly one agency with an id resolves to the list.
 */
export const resolveAgencyAdminLanding = (agencies: unknown): string => {
    if (Array.isArray(agencies) && agencies.length === 1) {
        const id = agencies[0]?.id;
        if (id !== undefined && id !== null && `${id}` !== '') {
            return `${routePathNames.agency}/${id}`;
        }
    }
    return routePathNames.agency;
};
