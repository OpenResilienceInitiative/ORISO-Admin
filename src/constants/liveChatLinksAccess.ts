import { UserRole } from '../enums/UserRole';
import type { HasRoleFn } from './caseHandoverAccess';

export type LiveChatLinksAccess = 'manage' | 'read' | 'none';

/**
 * Who sees the live-chat links in Funktionszugriff, and how (ORISO-Admin#1321).
 *
 * The platform admin creates and switches them off. Träger and Beratungsstellen
 * admins only copy them, e.g. for their website; the server already limits the
 * list to their tenant or agencies.
 */
export const resolveLiveChatLinksAccess = ({
    isSuperAdmin,
    hasRole,
}: {
    isSuperAdmin: boolean;
    hasRole: HasRoleFn;
}): LiveChatLinksAccess => {
    if (isSuperAdmin) {
        return 'manage';
    }
    if (
        hasRole([
            UserRole.TenantAdmin,
            UserRole.SingleTenantAdmin,
            UserRole.AgencyAdmin,
            UserRole.RestrictedAgencyAdmin,
        ])
    ) {
        return 'read';
    }
    return 'none';
};

/**
 * The agency's own Funktionszugriff shows the links only to Beratungsstellen
 * admins. Platform and Träger admins see them under Einstellungen →
 * Funktionszugriff already; repeating the tenant-wide list on every agency
 * would suggest the links belong to that one agency.
 */
export const resolveAgencyLiveChatLinksAccess = ({
    isSuperAdmin,
    isTenantScopedAdmin,
    hasRole,
}: {
    isSuperAdmin: boolean;
    isTenantScopedAdmin: boolean;
    hasRole: HasRoleFn;
}): 'read' | 'none' =>
    !isSuperAdmin && !isTenantScopedAdmin && hasRole([UserRole.AgencyAdmin, UserRole.RestrictedAgencyAdmin])
        ? 'read'
        : 'none';
