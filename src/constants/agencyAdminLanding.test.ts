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
    it('routes straight into the settings of the single administered agency', () => {
        expect(resolveAgencyAdminLanding({ total: 1, data: [{ id: 42, name: 'Beratungsstelle Nord' }] })).toBe(
            `${routePathNames.agency}/42`,
        );
    });

    it('routes to the list when several agencies are administered', () => {
        expect(resolveAgencyAdminLanding({ total: 2, data: [{ id: 1 }, { id: 2 }] })).toBe(routePathNames.agency);
    });

    it('routes to the list when the first page holds one of several agencies', () => {
        // Page size 1 of three administered agencies is still a list, not a single assignment.
        expect(resolveAgencyAdminLanding({ total: 3, data: [{ id: 1 }] })).toBe(routePathNames.agency);
    });

    it('routes to the list when nothing usable is administered', () => {
        expect(resolveAgencyAdminLanding({ total: 0, data: [] })).toBe(routePathNames.agency);
        expect(resolveAgencyAdminLanding(undefined)).toBe(routePathNames.agency);
        expect(resolveAgencyAdminLanding({ total: 1, data: [{ name: 'no id' }] })).toBe(routePathNames.agency);
    });

    it('ignores the consultant assignment shape that caused the wrong forward', () => {
        // `GET /service/users/data` answers with a bare array of the CONSULTANT agencies. Passing
        // that here used to forward an admin into a centre they do not administer (#917).
        expect(resolveAgencyAdminLanding([{ id: 24, name: 'Centre they only counsel in' }])).toBe(
            routePathNames.agency,
        );
    });
});
