import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { getEffectivePermissionRoles, mergeUserPermissions } from './userRolesToPermissions';

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
