import { getAccessTokenForRequests } from '../api/auth/auth';
import { UserRole } from '../enums/UserRole';
import parseJwt from '../utils/parseJWT';

export const useUserRoles = (): {
    roles: UserRole[];
    hasRole: (role: UserRole | UserRole[]) => boolean;
    isSuperAdmin: boolean;
    isTechnicalAccount: boolean;
    isTenantScopedAdmin: boolean;
    isGlobalSupportAdmin: boolean;
    tenantId: number | null;
    /**
     * An access token exists but could not be decoded (malformed JWT). Roles
     * and tenantId are unknown in that case — security gates (e.g. the DPA
     * blocker) must fail closed instead of treating this as "no roles".
     */
    tokenUnreadable: boolean;
} => {
    let payload;
    let tokenRoles: UserRole[] = [];
    let tokenUnreadable = false;

    const accessToken = getAccessTokenForRequests();

    if (accessToken) {
        payload = parseJwt(accessToken);
        tokenUnreadable = payload === null;
        // A token without realm_access (misconfigured account) must degrade to
        // "no roles", not crash the render tree.
        tokenRoles = payload?.realm_access?.roles ?? [];
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
    // ADR-018: a support identity holds exactly this role, so the support surfaces key off it
    // directly rather than off any admin capability.
    const isGlobalSupportAdmin = hasRole(UserRole.GlobalSupportAdmin);

    return {
        roles,
        hasRole,
        isSuperAdmin,
        isTechnicalAccount,
        isTenantScopedAdmin,
        isGlobalSupportAdmin,
        tenantId,
        tokenUnreadable,
    };
};
