import { describe, expect, it } from 'vite-plus/test';
import { UserRole } from '../enums/UserRole';
import { hasRoleFor } from '../components/Layout/adminNavFixtures';
import { resolveAgencyLiveChatLinksAccess, resolveLiveChatLinksAccess } from './liveChatLinksAccess';

/**
 * Live-chat links live in Funktionszugriff (ORISO-Admin#1321): the platform
 * admin manages them, Träger and Beratungsstellen admins may only copy them.
 */
describe('resolveLiveChatLinksAccess', () => {
    it('lets the platform admin manage links', () => {
        expect(resolveLiveChatLinksAccess({ isSuperAdmin: true, hasRole: hasRoleFor() })).toBe('manage');
    });

    it.each([
        ['Träger admin', [UserRole.TenantAdmin]],
        ['single-tenant admin', [UserRole.SingleTenantAdmin]],
        ['Beratungsstellen admin', [UserRole.AgencyAdmin, UserRole.UserAdmin]],
        ['restricted Beratungsstellen admin', [UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin]],
    ])('gives the %s read-only access', (_label, roles) => {
        expect(resolveLiveChatLinksAccess({ isSuperAdmin: false, hasRole: hasRoleFor(...roles) })).toBe('read');
    });

    it('hides the links from everyone else', () => {
        expect(resolveLiveChatLinksAccess({ isSuperAdmin: false, hasRole: hasRoleFor(UserRole.UserAdmin) })).toBe(
            'none',
        );
    });
});

describe('resolveAgencyLiveChatLinksAccess', () => {
    it.each([
        ['Beratungsstellen admin', [UserRole.AgencyAdmin, UserRole.UserAdmin]],
        ['restricted Beratungsstellen admin', [UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin]],
    ])('shows the %s the links of their agencies read-only', (_label, roles) => {
        expect(
            resolveAgencyLiveChatLinksAccess({
                isSuperAdmin: false,
                isTenantScopedAdmin: false,
                hasRole: hasRoleFor(...roles),
            }),
        ).toBe('read');
    });

    // They find them under Einstellungen → Funktionszugriff; a second copy per
    // agency would show the same tenant-wide list again.
    it.each([
        ['platform admin', true, false],
        ['Träger admin', false, true],
    ])('does not repeat them on the agency page for the %s', (_label, isSuperAdmin, isTenantScopedAdmin) => {
        expect(
            resolveAgencyLiveChatLinksAccess({
                isSuperAdmin,
                isTenantScopedAdmin,
                hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin),
            }),
        ).toBe('none');
    });
});
