import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { UserPermissions } from '../types/UserPermission';
import {
    enforceRestrictedAgencyAdminCeiling,
    getEffectivePermissionRoles,
    mergeUserPermissions,
    useUserRolesToPermission,
} from './userRolesToPermissions';

// The TenantAdminUser regression pins below must exercise the REAL role-to-permission
// map inside useUserRolesToPermission (the 9fd581b73 regression happened in that map,
// not in the merge helpers), so the hook's inputs are mocked instead of mirroring
// fragments into the test file.
const hookMocks = vi.hoisted(() => ({
    useUserRoles: vi.fn(),
}));

vi.mock('../hooks/useUserRoles.hook', () => ({
    useUserRoles: hookMocks.useUserRoles,
}));
vi.mock('../hooks/useTenantData.hook', () => ({
    useTenantData: () => ({ data: { settings: { featureTopicsEnabled: true } } }),
}));
vi.mock('../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: {
            multitenancyWithSingleDomainEnabled: false,
            legalContentChangesBySingleTenantAdminsAllowed: true,
        },
    }),
}));

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
const SINGLE_TENANT_ADMIN_PERMISSIONS: UserPermissions = {
    Tenant: { read: true, update: true },
    Statistic: { read: true },
};
const TOPIC_ADMIN_PERMISSIONS: UserPermissions = {
    Topic: { read: true, create: true, update: true, delete: true },
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
            [UserRole.SingleTenantAdmin]: SINGLE_TENANT_ADMIN_PERMISSIONS,
            [UserRole.TopicAdmin]: TOPIC_ADMIN_PERMISSIONS,
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

    it('keeps statistics visible for a restricted agency admin who is also a full agency admin', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.AgencyAdmin);

        // Full agency admins see the statistics of their Beratungsstelle; the restricted flag must
        // not strip that.
        expect(permissions.Statistic?.read).toBe(true);
    });

    it('caps statistics for a restricted agency admin who is only also a single-tenant admin', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.SingleTenantAdmin);

        // single-tenant-admin does not outrank the restricted ceiling, so the restricted actor
        // stays limited: no agency-admin management and no statistics.
        expect(permissions.AgencyAdminUser).toEqual(DENIED_AGENCY_ADMIN_USER);
        expect(permissions.Statistic?.read).toBe(false);
    });

    it('preserves an orthogonal Topic grant while capping a restricted agency admin', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.TopicAdmin);

        // The ceiling only caps the restricted role's own surface; a topic admin's orthogonal
        // Topic rights must survive.
        expect(permissions.AgencyAdminUser).toEqual(DENIED_AGENCY_ADMIN_USER);
        expect(permissions.Topic).toEqual({ read: true, create: true, update: true, delete: true });
    });

    it('keeps full agency-admin rights for a restricted agency admin who is also a full agency admin', () => {
        const permissions = resolve(UserRole.RestrictedAgencyAdmin, UserRole.AgencyAdmin, UserRole.UserAdmin);

        expect(permissions.Agency).toEqual({ read: true, create: true, update: true, delete: true });
    });
});

// #902 regression pins: commit 9fd581b73 flipped create/update/delete on TenantAdminUser
// to isSuperAdmin for the TenantAdmin role; the next-day hotfix 1665b33f4 restored only
// read. These tests run the real map so the full permission set cannot silently regress
// again — a Träger-Admin manages the tenant admins of their own tenant by design (tenant
// scoping is the backend's job, and the platform-admins SECTION stays super-admin-only in
// the UI, which UserManagementTable enforces per section, not this map).
describe('useUserRolesToPermission — TenantAdminUser (#902)', () => {
    const resolvePermissions = (roles: UserRole[], isSuperAdmin: boolean): UserPermissions => {
        hookMocks.useUserRoles.mockReturnValue({ roles, isSuperAdmin });

        return renderHook(() => useUserRolesToPermission()).result.current;
    };

    it('grants a tenant-scoped tenant admin read, create, update and delete on TenantAdminUser', () => {
        const permissions = resolvePermissions([UserRole.TenantAdmin], false);

        expect(permissions.TenantAdminUser).toEqual({ read: true, create: true, update: true, delete: true });
    });

    it('grants a platform admin (super admin) read, create, update and delete on TenantAdminUser', () => {
        const permissions = resolvePermissions([UserRole.TenantAdmin, UserRole.AgencyAdmin], true);

        expect(permissions.TenantAdminUser).toEqual({ read: true, create: true, update: true, delete: true });
    });

    it('keeps Tenant create/delete super-admin-only for a tenant-scoped tenant admin', () => {
        const permissions = resolvePermissions([UserRole.TenantAdmin], false);

        // The #902 revert is scoped to TenantAdminUser: managing tenants themselves
        // stays a super-admin surface.
        expect(permissions.Tenant).toEqual({ read: true, update: true, create: false, delete: false });
    });

    it('keeps Tenant create/delete granted for a platform admin (super admin)', () => {
        const permissions = resolvePermissions([UserRole.TenantAdmin, UserRole.AgencyAdmin], true);

        expect(permissions.Tenant).toEqual({ read: true, update: true, create: true, delete: true });
    });
});
