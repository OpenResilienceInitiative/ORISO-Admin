import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { hasRoleFor } from '../components/Layout/adminNavFixtures';
import { canSeeLinksSection, resolveInviteViewerScope, resolveVisibleLinksTabs } from './linksAccess';

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
    ])('%s sees only counsellor invites into their own agencies (#1026)', (_label, roles) => {
        const context = { isSuperAdmin: false, hasRole: hasRoleFor(...roles) };
        expect(resolveVisibleLinksTabs(context)).toEqual(['counsellor']);
        expect(canSeeLinksSection(context)).toBe(true);
    });

    it('an account without admin roles sees no Links section', () => {
        const context = { isSuperAdmin: false, hasRole: hasRoleFor() };
        expect(resolveVisibleLinksTabs(context)).toEqual([]);
        expect(canSeeLinksSection(context)).toBe(false);
    });

    it.each([
        ['platform admin', 'platform', { isSuperAdmin: true, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) }],
        ['tenant admin', 'tenant', { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) }],
        ['agency admin', 'agency', { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.AgencyAdmin, UserRole.UserAdmin) }],
        [
            'restricted agency admin',
            'agency',
            { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin) },
        ],
    ] as const)('the %s invites with viewer scope "%s"', (_label, scope, context) => {
        expect(resolveInviteViewerScope(context)).toBe(scope);
    });
});
