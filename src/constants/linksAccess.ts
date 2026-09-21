import { UserRole } from '../enums/UserRole';
import type { HasRoleFn } from './caseHandoverAccess';
import type { InviteViewerScope } from '../pages/Links/inviteModel';

/**
 * Which "Links" tabs an admin may see. The section hands out invite links, and each
 * tab creates something a level BELOW the admin who uses it:
 *
 * - "Träger-Invites" create whole tenants and "Externe Inbounds" configure
 *   platform-wide inbound links → platform admin only.
 * - "Berater-Invites" create counsellors inside the admin's own unit → platform
 *   admin, tenant admin, and (#1026) Beratungsstellen-Admins (`agency-admin` /
 *   `restricted-agency-admin` without `tenant-admin`), who may invite ONLY
 *   counsellors into their own agencies. The backend enforces that rule
 *   (UserService#1215) and scopes the invite list and the agency search.
 */
export type LinksTabKey = 'tenants' | 'counsellor' | 'external-inbounds';

export interface LinksAccessContext {
    isSuperAdmin: boolean;
    hasRole: HasRoleFn;
}

const isAgencyAdmin = (hasRole: HasRoleFn): boolean =>
    hasRole([UserRole.AgencyAdmin, UserRole.RestrictedAgencyAdmin]);

export const resolveVisibleLinksTabs = ({ isSuperAdmin, hasRole }: LinksAccessContext): LinksTabKey[] => {
    if (isSuperAdmin) {
        return ['tenants', 'counsellor', 'external-inbounds'];
    }
    if (hasRole(UserRole.TenantAdmin) || isAgencyAdmin(hasRole)) {
        return ['counsellor'];
    }
    return [];
};

/**
 * Who fills the counsellor tab's invite bar (#1026): the platform admin edits
 * everything, a tenant admin is pinned to their own Träger, a Beratungsstellen-
 * Admin to their own Träger AND own agencies and may invite counsellors only.
 */
export const resolveInviteViewerScope = ({ isSuperAdmin, hasRole }: LinksAccessContext): InviteViewerScope => {
    if (isSuperAdmin) return 'platform';
    if (!hasRole(UserRole.TenantAdmin) && isAgencyAdmin(hasRole)) return 'agency';
    return 'tenant';
};

export const canSeeLinksSection = (context: LinksAccessContext): boolean => resolveVisibleLinksTabs(context).length > 0;
