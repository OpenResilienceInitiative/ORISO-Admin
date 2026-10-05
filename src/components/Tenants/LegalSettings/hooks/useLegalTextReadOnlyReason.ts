import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';
import { UserRole } from '../../../../enums/UserRole';

export interface LegalTextReadOnlyReason {
    /** i18n key of the sentence that says why the legal text cannot be changed. */
    key: string;
    /** The platform-wide switch is what blocks this admin (not their role). */
    platformLock: boolean;
}

/**
 * Why a legal text is read-only for the signed-in admin (#1066). Only these roles gain the edit
 * right through `legalContentChangesBySingleTenantAdminsAllowed` (userRolesToPermissions), so only
 * for them is the platform-wide lock the honest reason; everyone else is blocked by their role.
 */
const LOCK_GOVERNED_ROLES = [UserRole.AgencyAdmin, UserRole.SingleTenantAdmin];

export const useLegalTextReadOnlyReason = (): LegalTextReadOnlyReason => {
    const { settings } = useAppConfigContext();
    const { hasRole } = useUserRoles();
    const locked =
        !!settings?.multitenancyWithSingleDomainEnabled && !settings?.legalContentChangesBySingleTenantAdminsAllowed;
    const platformLock = locked && LOCK_GOVERNED_ROLES.some((role) => hasRole(role));
    return platformLock
        ? { key: 'tenants.legal.readOnly.lockedPlatformWide', platformLock }
        : { key: 'tenants.legal.readOnly.managedByTraeger', platformLock };
};
