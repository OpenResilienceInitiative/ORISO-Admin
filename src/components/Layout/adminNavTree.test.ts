import { describe, expect, it } from 'vitest';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';
import { buildAdminNavTree, type AdminNavTreeContext } from './adminNavTree';

const base: Omit<AdminNavTreeContext, 'can' | 'hasRole' | 'isSuperAdmin'> = {
    canManageServiceNotices: false,
    shouldShowThemeSettings: true,
    isTenantSettingsEditEnabled: false,
    multitenancyWithSingleDomainEnabled: true,
};

const ids = (tree: ReturnType<typeof buildAdminNavTree>, key: string) => tree[key].map((entry) => entry.id);

describe('buildAdminNavTree', () => {
    it('gives the platform admin every settings, account, log and link destination', () => {
        const tree = buildAdminNavTree({
            ...base,
            isSuperAdmin: true,
            canManageServiceNotices: true,
            hasRole: () => false,
            can: () => true,
        });

        expect(ids(tree, 'theme')).toEqual([
            'settings:global-config',
            'settings:master-data',
            'settings:general',
            'settings:legal',
            'settings:smtp',
            'settings:service-notices',
            'settings:permissions',
        ]);
        expect(ids(tree, 'counselors')).toEqual([
            'users:platform-admins',
            'users:tenant-admins',
            'users:agency-admins',
            'users:counsellors',
        ]);
        expect(ids(tree, 'links')).toEqual(['links:tenants', 'links:counsellor']);
        expect(ids(tree, 'logs')).toContain('logs:inactive');
    });

    it('offers an agency admin only what the pages would let them open', () => {
        const tree = buildAdminNavTree({
            ...base,
            shouldShowThemeSettings: false,
            isSuperAdmin: false,
            hasRole: (role) => [role].flat().includes(UserRole.AgencyAdmin),
            can: (action, resource) =>
                resource === Resource.Consultant ||
                (resource === Resource.LegalText && action === PermissionAction.Read),
        });

        // A single permitted tab stays in the tree so search still finds it
        // ("Datenschutz" → Rechtliches); the menu renders it as a plain link.
        expect(ids(tree, 'theme')).toEqual(['settings:legal']);
        expect(ids(tree, 'counselors')).toEqual(['users:counsellors']);
        expect(ids(tree, 'links')).toEqual(['links:tenants', 'links:counsellor']);
        expect(ids(tree, 'logs')).not.toContain('logs:inactive');
    });

    it('returns empty lists for an admin without permissions', () => {
        const tree = buildAdminNavTree({ ...base, isSuperAdmin: false, hasRole: () => false, can: () => false });

        expect(Object.values(tree).every((list) => list.length === 0)).toBe(true);
    });
});
