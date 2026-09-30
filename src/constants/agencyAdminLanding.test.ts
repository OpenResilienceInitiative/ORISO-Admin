import { describe, expect, it } from 'vitest';
import { isAgencyScopedAdmin, resolveAgencyAdminLanding } from './agencyAdminLanding';
import { hasRoleFor } from '../components/Layout/adminNavFixtures';
import routePathNames from '../appConfig';
import { UserRole } from '../enums/UserRole';

describe('isAgencyScopedAdmin', () => {
    it('is true for the standard Beratungsstellen-Admin bundle', () => {
        expect(isAgencyScopedAdmin(hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin))).toBe(true);
    });

    it('is false for tenant-level admins, even when they also hold the restricted role', () => {
        expect(isAgencyScopedAdmin(hasRoleFor(UserRole.TenantAdmin))).toBe(false);
        expect(isAgencyScopedAdmin(hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.TenantAdmin))).toBe(false);
        expect(isAgencyScopedAdmin(hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.SingleTenantAdmin))).toBe(false);
    });

    it('is false without the restricted role', () => {
        expect(isAgencyScopedAdmin(hasRoleFor(UserRole.UserAdmin))).toBe(false);
        expect(isAgencyScopedAdmin(hasRoleFor())).toBe(false);
    });
});

describe('resolveAgencyAdminLanding', () => {
    it('routes straight into the settings of the single assigned agency', () => {
        expect(resolveAgencyAdminLanding([{ id: 42, name: 'Beratungsstelle Nord' }])).toBe(
            `${routePathNames.agency}/42`,
        );
    });

    it('routes to the list when several agencies are assigned', () => {
        expect(resolveAgencyAdminLanding([{ id: 1 }, { id: 2 }])).toBe(routePathNames.agency);
    });

    it('routes to the list when nothing usable is assigned', () => {
        expect(resolveAgencyAdminLanding([])).toBe(routePathNames.agency);
        expect(resolveAgencyAdminLanding(undefined)).toBe(routePathNames.agency);
        expect(resolveAgencyAdminLanding([{ name: 'no id' }])).toBe(routePathNames.agency);
    });
});
