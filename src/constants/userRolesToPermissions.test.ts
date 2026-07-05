import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { UserPermissions } from '../types/UserPermission';
import {
    enforceRestrictedAgencyAdminCeiling,
    getEffectivePermissionRoles,
    mergeUserPermissions,
} from './userRolesToPermissions';

// Permission fragments mirroring the role-to-permission map in useUserRolesToPermission,
// so the outcome-level tests below exercise the real merge + ceiling composition.
const RESTRICTED_AGENCY_ADMIN_PERMISSIONS: UserPermissions = {
    Statistic: { read: false },
    Agency: { read: true, create: false, update: true, delete: false },
    AgencyAdminUser: { read: false, create: false, update: false, delete: false },
};
const USER_ADMIN_PERMISSIONS: UserPermissions = {
    Consultant: { read: true, create: true, update: true, delete: true },
    AgencyAdminUser: { read: true, create: true, update: true, delete: true },
};
const TENANT_ADMIN_PERMISSIONS: UserPermissions = {
    Tenant: { read: true, update: true, create: false, delete: false },
    AgencyAdminUser: { read: true, create: true, update: true, delete: true },
};
const FULL_AGENCY_ADMIN_PERMISSIONS: UserPermissions = {
    Agency: { read: true, create: true, update: true, delete: true },
    Statistic: { read: true },
};
const DENIED_AGENCY_ADMIN_USER = { read: false, create: false, update: false, delete: false };

describe('mergeUserPermissions', () => {
    it('keeps broader agency grants when effective roles contain agency admin', () => {
        const merged = mergeUserPermissions(
            {
                Agency: { read: true, create: true, update: true, delete: true },
                Statistic: { read: true },
            },
            {
                Agency: { read: true, create: false, update: true, delete: false },
                Statistic: { read: false },
            },
        );

        expect(merged.Agency).toEqual({ read: true, create: true, update: true, delete: true });
        expect(merged.Statistic?.read).toBe(true);
    });

    it('leaves an action denied when no role grants it', () => {
        const merged = mergeUserPermissions({
            Agency: { create: false },
        });

        expect(merged.Agency?.create).toBe(false);
    });
});

describe('getEffectivePermissionRoles', () => {
    it('keeps unrelated secondary roles when restricted agency admins have no full agency-admin role', () => {
        const roles = getEffectivePermissionRoles([UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin]);

        expect(roles).toEqual([UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin]);
    });

    it('keeps tenant admin permissions for restricted agency admins without full agency-admin', () => {
        const roles = getEffectivePermissionRoles([UserRole.RestrictedAgencyAdmin, UserRole.TenantAdmin]);

        expect(roles).toEqual([UserRole.RestrictedAgencyAdmin, UserRole.TenantAdmin]);
    });

    it('keeps broader admin roles for agency super admins', () => {
        const roles = getEffectivePermissionRoles([
            UserRole.RestrictedAgencyAdmin,
            UserRole.UserAdmin,
            UserRole.AgencyAdmin,
        ]);

        expect(roles).toEqual([UserRole.RestrictedAgencyAdmin, UserRole.AgencyAdmin, UserRole.UserAdmin]);
    });
});

describe('enforceRestrictedAgencyAdminCeiling', () => {
    it('denies AgencyAdminUser when a restricted agency admin has no overriding agency role', () => {
        const merged = mergeUserPermissions({
            AgencyAdminUser: { read: true, create: true, update: true, delete: true },
        });

        const capped = enforceRestrictedAgencyAdminCeiling(merged, [UserRole.RestrictedAgencyAdmin]);

        expect(capped.AgencyAdminUser).toEqual(DENIED_AGENCY_ADMIN_USER);
    });

    it('leaves permissions untouched when the restricted role is absent', () => {
        const merged = mergeUserPermissions(USER_ADMIN_PERMISSIONS);

        const capped = enforceRestrictedAgencyAdminCeiling(merged, [UserRole.UserAdmin]);

        expect(capped.AgencyAdminUser).toEqual({ read: true, create: true, update: true, delete: true });
    });

    it('lets a full agency admin override the ceiling', () => {
        const capped = enforceRestrictedAgencyAdminCeiling(
            { AgencyAdminUser: { read: true, create: true, update: true, delete: true } },
            [UserRole.RestrictedAgencyAdmin, UserRole.AgencyAdmin],
        );

        expect(capped.AgencyAdminUser).toEqual({ read: true, create: true, update: true, delete: true });
    });

    it('lets a tenant admin override the ceiling', () => {
        const capped = enforceRestrictedAgencyAdminCeiling(
            { AgencyAdminUser: { read: true, create: true, update: true, delete: true } },
            [UserRole.RestrictedAgencyAdmin, UserRole.TenantAdmin],
        );

        expect(capped.AgencyAdminUser).toEqual({ read: true, create: true, update: true, delete: true });
    });
});

// Outcome-level policy tests: merge the real role fragments and apply the ceiling, then assert on
// the resulting permission surface (not just the effective role array). These would fail if the
// restriction were ever silently dropped again.
describe('restricted agency admin permission policy', () => {
    const resolve = (...roles: UserRole[]): UserPermissions => {
        const fragmentByRole: Partial<Record<UserRole, UserPermissions>> = {
            [UserRole.RestrictedAgencyAdmin]: RESTRICTED_AGENCY_ADMIN_PERMISSIONS,
            [UserRole.UserAdmin]: USER_ADMIN_PERMISSIONS,
            [UserRole.TenantAdmin]: TENANT_ADMIN_PERMISSIONS,
            [UserRole.AgencyAdmin]: FULL_AGENCY_ADMIN_PERMISSIONS,
        };
        const effectiveRoles = getEffectivePermissionRoles(roles);
        const merged = mergeUserPermissions(...effectiveRoles.map((role) => fragmentByRole[role]));

        return enforceRestrictedAgencyAdminCeiling(merged, effectiveRoles);
    };

    it('blocks the restricted-agency-admin + user-admin escalation to AgencyAdminUser', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin);

        expect(permissions.AgencyAdminUser).toEqual(DENIED_AGENCY_ADMIN_USER);
    });

    it('preserves the user-admin Consultant grant while blocking AgencyAdminUser', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin);

        // Sentry's concern: orthogonal permissions from secondary roles must survive.
        expect(permissions.Consultant).toEqual({ read: true, create: true, update: true, delete: true });
    });

    it('keeps AgencyAdminUser for a restricted agency admin who is also a tenant admin', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.TenantAdmin);

        expect(permissions.AgencyAdminUser).toEqual({ read: true, create: true, update: true, delete: true });
        expect(permissions.Tenant).toEqual({ read: true, update: true, create: false, delete: false });
    });

    it('keeps full agency-admin rights for a restricted agency admin who is also a full agency admin', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.AgencyAdmin, UserRole.UserAdmin);

        expect(permissions.Agency).toEqual({ read: true, create: true, update: true, delete: true });
    });
});
