import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { hasRoleFor } from '../components/Layout/adminNavFixtures';
import {
    canEditSharedTemplates,
    canSeeLinksSection,
    resolveVisibleLinksTabs,
    resolveVisibleTemplateKinds,
} from './linksAccess';

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

/**
 * Invite e-mail templates are stored WITHOUT a tenant — deliberately (see the
 * `not.toHaveProperty('tenantId')` assertion in EmailTemplatesDialog.test.tsx):
 * one text is shared by the whole platform and each tenant's branding is applied
 * at render time. So a template is never "this tenant's", and what an admin may
 * see or change follows from the Links tabs they may use, nothing finer.
 */
describe('linksAccess — invite e-mail templates', () => {
    const platformAdmin = { isSuperAdmin: true, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) };
    const tenantAdmin = { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) };
    const agencyAdmin = { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.AgencyAdmin, UserRole.UserAdmin) };

    it('shows the platform admin every kind', () => {
        expect(resolveVisibleTemplateKinds(platformAdmin)).toEqual([
            'TENANT_INVITE',
            'DPA_FORWARD',
            'COUNSELLOR_INVITE',
        ]);
    });

    it('shows a tenant admin only the counsellor invite — the one tab they have', () => {
        // Tenant invites create tenants and the contract forward belongs to the
        // platform operator; neither is a tenant admin's to see or pick.
        expect(resolveVisibleTemplateKinds(tenantAdmin)).toEqual(['COUNSELLOR_INVITE']);
    });

    it('shows an agency admin nothing', () => {
        expect(resolveVisibleTemplateKinds(agencyAdmin)).toEqual([]);
    });

    it('lets only the platform admin change a shared template', () => {
        // A template is shared by every tenant, so one tenant admin's edit would
        // change the mail every other tenant sends.
        expect(canEditSharedTemplates(platformAdmin)).toBe(true);
        expect(canEditSharedTemplates(tenantAdmin)).toBe(false);
        expect(canEditSharedTemplates(agencyAdmin)).toBe(false);
    });
});
