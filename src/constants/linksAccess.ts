import { UserRole } from '../enums/UserRole';
import type { HasRoleFn } from './caseHandoverAccess';

/**
 * Which "Links" tabs an admin may see. The section hands out invite links, and each
 * tab creates something a level BELOW the admin who uses it:
 *
 * - "Träger-Invites" create whole tenants and "Externe Inbounds" configure
 *   platform-wide inbound links → platform admin only.
 * - "Berater-Invites" create counsellors inside the admin's own tenant → platform
 *   admin and tenant admin.
 * - Beratungsstellen-Admins (`agency-admin` / `restricted-agency-admin` without
 *   `tenant-admin`) invite nobody through links, so they get no "Links" section.
 */
export type LinksTabKey = 'tenants' | 'counsellor' | 'external-inbounds';

export interface LinksAccessContext {
    isSuperAdmin: boolean;
    hasRole: HasRoleFn;
}

export const resolveVisibleLinksTabs = ({ isSuperAdmin, hasRole }: LinksAccessContext): LinksTabKey[] => {
    if (isSuperAdmin) {
        return ['tenants', 'counsellor', 'external-inbounds'];
    }
    if (hasRole(UserRole.TenantAdmin)) {
        return ['counsellor'];
    }
    return [];
};

export const canSeeLinksSection = (context: LinksAccessContext): boolean => resolveVisibleLinksTabs(context).length > 0;
