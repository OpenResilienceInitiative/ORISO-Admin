import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { UserRole } from '../enums/UserRole';

const { useUserRoles, useTenantData, useAppConfigContext } = vi.hoisted(() => ({
    useUserRoles: vi.fn(),
    useTenantData: vi.fn(),
    useAppConfigContext: vi.fn(),
}));

vi.mock('../hooks/useUserRoles.hook', () => ({ useUserRoles }));
vi.mock('../hooks/useTenantData.hook', () => ({ useTenantData }));
vi.mock('../context/useAppConfig', () => ({ useAppConfigContext }));

// eslint-disable-next-line import/first
import { useUserRolesToPermission } from './userRolesToPermissions';

const setup = ({
    roles,
    multitenancyWithSingleDomainEnabled = false,
    legalContentChangesBySingleTenantAdminsAllowed = false,
}: {
    roles: UserRole[];
    multitenancyWithSingleDomainEnabled?: boolean;
    legalContentChangesBySingleTenantAdminsAllowed?: boolean;
}) => {
    useUserRoles.mockReturnValue({ roles, isSuperAdmin: false });
    useTenantData.mockReturnValue({ data: { settings: {} } });
    useAppConfigContext.mockReturnValue({
        settings: { multitenancyWithSingleDomainEnabled, legalContentChangesBySingleTenantAdminsAllowed },
    });
    return renderHook(() => useUserRolesToPermission()).result.current;
};

/**
 * #609: the Fachbereich legal editors had no permission check at all, because the
 * agency-admin role carried no `LegalText` entry — `can(update, LegalText)` was
 * simply false and nobody asked. The role now mirrors the tenant-level rule.
 */
describe('agency admin — legal-text permission (#609)', () => {
    it('may change legal content in a deployment without single-domain multitenancy', () => {
        const permissions = setup({ roles: [UserRole.AgencyAdmin] });
        expect(permissions.LegalText?.update).toBe(true);
    });

    it('may not change it when single-domain multitenancy withholds the delegation', () => {
        const permissions = setup({
            roles: [UserRole.AgencyAdmin],
            multitenancyWithSingleDomainEnabled: true,
            legalContentChangesBySingleTenantAdminsAllowed: false,
        });
        expect(permissions.LegalText?.update).toBe(false);
    });

    it('may change it again once the Träger delegates legal content', () => {
        const permissions = setup({
            roles: [UserRole.AgencyAdmin],
            multitenancyWithSingleDomainEnabled: true,
            legalContentChangesBySingleTenantAdminsAllowed: true,
        });
        expect(permissions.LegalText?.update).toBe(true);
    });

    it('can always read the text — a policy nobody may look at helps no one', () => {
        const permissions = setup({
            roles: [UserRole.AgencyAdmin],
            multitenancyWithSingleDomainEnabled: true,
            legalContentChangesBySingleTenantAdminsAllowed: false,
        });
        expect(permissions.LegalText?.read).toBe(true);
    });

    it('leaves a tenant admin unaffected — they keep the unconditional right', () => {
        const permissions = setup({
            roles: [UserRole.TenantAdmin],
            multitenancyWithSingleDomainEnabled: true,
            legalContentChangesBySingleTenantAdminsAllowed: false,
        });
        expect(permissions.LegalText?.update).toBe(true);
    });
});
