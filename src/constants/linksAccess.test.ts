import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { hasRoleFor } from '../components/Layout/adminNavFixtures';
import { canSeeLinksSection, resolveVisibleLinksTabs } from './linksAccess';

describe('linksAccess', () => {
    it('platform admin sees every tab', () => {
        const context = { isSuperAdmin: true, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) };
        expect(resolveVisibleLinksTabs(context)).toEqual(['tenants', 'counsellor', 'external-inbounds']);
        expect(canSeeLinksSection(context)).toBe(true);
    });

    it('tenant admin sees only counsellor invites (no tenant invites, no external inbounds)', () => {
        const context = { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) };
        expect(resolveVisibleLinksTabs(context)).toEqual(['counsellor']);
        expect(canSeeLinksSection(context)).toBe(true);
    });

    it.each([
        ['agency admin', [UserRole.AgencyAdmin, UserRole.UserAdmin]],
        ['restricted agency admin', [UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin]],
        ['no roles', []],
    ])('%s sees no Links section', (_label, roles) => {
        const context = { isSuperAdmin: false, hasRole: hasRoleFor(...roles) };
        expect(resolveVisibleLinksTabs(context)).toEqual([]);
        expect(canSeeLinksSection(context)).toBe(false);
    });
});
