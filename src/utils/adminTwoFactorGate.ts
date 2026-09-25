import { UserRole } from '../enums/UserRole';
import { UserData } from '../types/user';

/**
 * Roles for which a second factor is mandatory, not encouraged (ORISO-Admin#891).
 *
 * The issue names tenant-admin and agency-admin. The two scoped variants are
 * included deliberately: `single-tenant-admin` is the Träger-Admin in
 * single-domain deployments and `restricted-agency-admin` is a Beratungsstellen-
 * Admin with a narrower scope — both administer the same data, so leaving them
 * out would be exactly the "additional roles must not bypass this rule" hole the
 * issue warns about.
 *
 * Roles that are NOT here stay untouched (topic-admin, user-admin, consultants):
 * widening beyond the administrator roles the issue names is a separate product
 * decision, not something to slip in under a security fix.
 */
export const MANDATORY_TWO_FACTOR_ROLES: readonly UserRole[] = [
    UserRole.TenantAdmin,
    UserRole.SingleTenantAdmin,
    UserRole.AgencyAdmin,
    UserRole.RestrictedAgencyAdmin,
];

export interface MandatoryTwoFactorInput {
    /** Realm roles from the access token. */
    roles: readonly UserRole[];
    /** Machine accounts cannot enrol a TOTP factor; the rule is for humans. */
    isTechnicalAccount: boolean;
    /** An access token exists but could not be decoded — roles are unknown. */
    tokenUnreadable: boolean;
    /** Undefined while the profile request is in flight or has failed. */
    userData?: UserData;
}

export const hasMandatoryTwoFactorRole = (roles: readonly UserRole[]): boolean =>
    roles.some((role) => MANDATORY_TWO_FACTOR_ROLES.includes(role));

/**
 * Whether the admin area must stay behind the two-factor enrolment screen.
 *
 * Unlike the previous platform-admin gate this has no "set up later" input at
 * all. A deferral parameter would be a bypass with a signature, and the issue
 * rules those out for these roles, so the only way past the screen is a
 * confirmed factor.
 *
 * Fails closed. Both unknown-roles (unreadable token) and unknown-2FA-state
 * (profile missing or failed to load) resolve to "blocked", because a
 * privileged screen rendered on missing evidence is the failure this issue
 * exists to prevent.
 */
export const requiresMandatoryTwoFactor = ({
    roles,
    isTechnicalAccount,
    tokenUnreadable,
    userData,
}: MandatoryTwoFactorInput): boolean => {
    // Roles unknown: no way to prove the account is NOT an administrator.
    if (tokenUnreadable) return true;

    if (isTechnicalAccount) return false;
    if (!hasMandatoryTwoFactorRole(roles)) return false;

    // 2FA state unknown: treat as not-yet-enrolled rather than waving through.
    if (!userData?.twoFactorAuth) return true;

    return userData.twoFactorAuth.isActive !== true;
};
