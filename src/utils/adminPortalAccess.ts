import { UserRole } from '../enums/UserRole';
import parseJwt from './parseJWT';

const ADMIN_PORTAL_ROLES = [
    UserRole.TenantAdmin,
    UserRole.SingleTenantAdmin,
    UserRole.UserAdmin,
    UserRole.AgencyAdmin,
    UserRole.RestrictedAgencyAdmin,
    UserRole.TopicAdmin,
    // ADR-018: the Global Support Admin's whole surface — target search, handshake, audit — is a
    // board in this portal. Leaving it out would provision an account that can never sign in.
    UserRole.GlobalSupportAdmin,
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
