import { UserRole } from '../enums/UserRole';
import parseJwt from './parseJWT';

const ADMIN_PORTAL_ROLES = [
    UserRole.TenantAdmin,
    UserRole.SingleTenantAdmin,
    UserRole.UserAdmin,
    UserRole.AgencyAdmin,
    UserRole.RestrictedAgencyAdmin,
    UserRole.TopicAdmin,
];

export const hasAdminPortalRole = (roles: string[] = []) => ADMIN_PORTAL_ROLES.some((role) => roles.includes(role));

export const hasAdminPortalAccess = (accessToken?: string) => {
    if (!accessToken) {
        return false;
    }

    try {
        const payload = parseJwt(accessToken);
        return hasAdminPortalRole(payload?.realm_access?.roles || []);
    } catch {
        return false;
    }
};
