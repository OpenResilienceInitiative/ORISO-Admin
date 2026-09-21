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
 * Where an agency-scoped admin lands: with exactly one administered agency straight into that
 * agency's settings, otherwise on the (server-side filtered) Beratungsstellen list.
 *
 * The argument is the response of `GET /service/agencyadmin/agencies`, which AgencyService already
 * narrows to the agencies the caller administers. Deliberately NOT the `agencies` array of
 * `GET /service/users/data`: that is the account's CONSULTANT assignment, so an admin who also
 * counsels somewhere else was forwarded into an agency they do not administer (ORISO-Admin#917).
 *
 * `total` decides, not the page: page one of three administered agencies is still a list.
 */
export const resolveAgencyAdminLanding = (agencies: unknown): string => {
    const list = agencies as { total?: number; data?: { id?: unknown }[] } | undefined;
    if (list?.total === 1 && list?.data?.length === 1) {
        const id = list.data[0]?.id;
        if (id !== undefined && id !== null && `${id}` !== '') {
            return `${routePathNames.agency}/${id}`;
        }
    }
    return routePathNames.agency;
};
