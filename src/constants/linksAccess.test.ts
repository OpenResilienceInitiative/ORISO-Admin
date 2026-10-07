import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/UserRole';
import { hasRoleFor } from '../components/Layout/adminNavFixtures';
import {
    canEditSharedTemplates,
    canSeeLinksSection,
    resolveInviteViewerScope,
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
    ])('%s sees only counsellor invites', (_label, roles) => {
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
        [
            'platform admin',
            'platform',
            { isSuperAdmin: true, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) },
        ],
        [
            'tenant admin',
            'tenant',
            { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.TenantAdmin, UserRole.AgencyAdmin) },
        ],
        [
            'agency admin',
            'agency',
            { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.AgencyAdmin, UserRole.UserAdmin) },
        ],
        [
            'restricted agency admin',
            'agency',
            { isSuperAdmin: false, hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin, UserRole.UserAdmin) },
        ],
    ] as const)('the %s invites with viewer scope "%s"', (_label, scope, context) => {
        expect(resolveInviteViewerScope(context)).toBe(scope);
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

    it('shows a Beratungsstellen admin the counsellor invite too', () => {
        // Whoever may send invites may also write templates for them.
        expect(resolveVisibleTemplateKinds(agencyAdmin)).toEqual(['COUNSELLOR_INVITE']);
    });

    it('still lets no Links admin see the platform operator’s kinds', () => {
        // Creating tenants and forwarding contracts stay the platform operator's work.
        expect(resolveVisibleTemplateKinds(tenantAdmin)).not.toContain('TENANT_INVITE');
        expect(resolveVisibleTemplateKinds(agencyAdmin)).not.toContain('DPA_FORWARD');
    });

    it('lets only the platform admin change a shared template', () => {
        // A template is shared by every tenant, so one tenant admin's edit would
        // change the mail every other tenant sends.
        expect(canEditSharedTemplates(platformAdmin)).toBe(true);
        expect(canEditSharedTemplates(tenantAdmin)).toBe(false);
        expect(canEditSharedTemplates(agencyAdmin)).toBe(false);
    });
});
