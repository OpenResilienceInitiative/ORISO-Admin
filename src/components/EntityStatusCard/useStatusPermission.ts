import { useQuery } from '@tanstack/react-query';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { useUserPermissions } from '../../hooks/useUserPermission';
import { UserRole } from '../../enums/UserRole';
import { Resource } from '../../enums/Resource';
import { PermissionAction } from '../../enums/PermissionAction';
import { listSelfAssignments } from '../../api/accountInvites/selfAssignments';
import type { EntityKind } from '../../api/entityStatus/entityStatus';

export const useStatusPermission = (kind: EntityKind, id: string, targetTenantId?: number | string) => {
    const { hasRole, tenantId, isSuperAdmin, isTechnicalAccount, tokenUnreadable } = useUserRoles();
    const { can } = useUserPermissions();
    const tenantAdmin = hasRole([UserRole.TenantAdmin, UserRole.SingleTenantAdmin]);
    const agencyAdmin = hasRole([UserRole.AgencyAdmin, UserRole.RestrictedAgencyAdmin]);
    const ownTenant = tenantId !== null && tenantId > 0 && tenantId === Number(targetTenantId);
    const assignments = useQuery({
        queryKey: ['status-self-assignments'],
        queryFn: listSelfAssignments,
        enabled: kind === 'agency' && ownTenant && agencyAdmin && !tenantAdmin,
        retry: false,
        refetchOnWindowFocus: false,
    });
    if (isTechnicalAccount || tokenUnreadable) return false;
    if (kind === 'tenant')
        return (
            tenantAdmin &&
            tenantId !== null &&
            tenantId > 0 &&
            tenantId === Number(id) &&
            can(PermissionAction.Update, Resource.Tenant)
        );
    if (kind === 'account') return isSuperAdmin || ownTenant;
    if (!can(PermissionAction.Update, Resource.Agency)) return false;
    // Existing global centre management is tied to the actual role+permission+tenant0 scope.
    if (isSuperAdmin && hasRole(UserRole.AgencyAdmin) && tenantId === 0) return true;
    if (ownTenant && tenantAdmin) return true;
    return (
        ownTenant &&
        agencyAdmin &&
        !assignments.isError &&
        assignments.data?.agencyAdminAgencyIds.includes(Number(id)) === true
    );
};
