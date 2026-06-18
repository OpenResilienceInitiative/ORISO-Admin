import { getAccessTokenForRequests } from '../api/auth/auth';
import { UserRole } from '../enums/UserRole';
import parseJwt from '../utils/parseJWT';

export const useUserRoles = (): {
    roles: UserRole[];
    hasRole: (role: UserRole | UserRole[]) => boolean;
    isSuperAdmin: boolean;
    isTechnicalAccount: boolean;
    isTenantScopedAdmin: boolean;
    tenantId: number | null;
} => {
    let payload;
    let tokenRoles: UserRole[] = [];

    const accessToken = getAccessTokenForRequests();

    if (accessToken) {
        payload = parseJwt(accessToken);
        tokenRoles = payload?.realm_access.roles || [];
    }

    let tenantId: number | null = null;
    if (typeof payload?.tenantId === 'number') {
        tenantId = payload.tenantId;
    } else if (typeof payload?.tenantId === 'string' && payload.tenantId.trim() !== '') {
        tenantId = Number(payload.tenantId);
    }
    const isTechnicalAccount = tokenRoles.includes(UserRole.Technical);

    // Keep all token roles so mixed-role admin accounts retain expected UI capabilities.
    const roles = tokenRoles;

    const hasRole = (userRole: UserRole | UserRole[]) => {
        const userRoles = Array.isArray(userRole) ? userRole : [userRole];
        return roles.some((role: UserRole) => userRoles.includes(role));
    };

    const isSuperAdmin = hasRole(UserRole.AgencyAdmin) && hasRole(UserRole.TenantAdmin) && tenantId === 0;
    const isTenantScopedAdmin = hasRole(UserRole.TenantAdmin) && tenantId !== null && tenantId > 0;

    return {
        roles,
        hasRole,
        isSuperAdmin,
        isTechnicalAccount,
        isTenantScopedAdmin,
        tenantId,
    };
};
