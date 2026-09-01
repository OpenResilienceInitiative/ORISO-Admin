import { describe, it, expect } from 'vitest';
import { USER_TABLE_CONFIGS, canManageSectionActions } from './userTableConfigs';
import { TypeOfUser } from '../../../enums/TypeOfUser';

const columnKeys = (typeOfUser: TypeOfUser) => USER_TABLE_CONFIGS[typeOfUser].columns.map((column) => column.key);

describe('userTableConfigs hasOtherIdentity column', () => {
    it.each([TypeOfUser.Consultants, TypeOfUser.AgencyAdmins, TypeOfUser.TenantAdmins])(
        'includes a non-sortable hasOtherIdentity column for %s',
        (typeOfUser) => {
            const column = USER_TABLE_CONFIGS[typeOfUser].columns.find((c) => c.key === 'hasOtherIdentity');
            expect(column).toBeDefined();
            expect(column?.sortable).toBeFalsy();
        },
    );

    it('does not add the hasOtherIdentity column to PlatformAdmins', () => {
        expect(columnKeys(TypeOfUser.PlatformAdmins)).not.toContain('hasOtherIdentity');
    });
});

// #902: Resource.TenantAdminUser is shared between the Träger-Admins and Platform-Admins
// sections, so restoring create/update/delete for tenant-scoped tenant admins must not
// surface manage actions on the platform-admins section (reachable by direct URL even
// though its pill is super-admin-only in UserSectionPills).
describe('canManageSectionActions (#902)', () => {
    it('keeps platform-admins manage actions super-admin-only', () => {
        expect(canManageSectionActions(TypeOfUser.PlatformAdmins, false)).toBe(false);
        expect(canManageSectionActions(TypeOfUser.PlatformAdmins, true)).toBe(true);
    });

    it.each([TypeOfUser.TenantAdmins, TypeOfUser.AgencyAdmins, TypeOfUser.Consultants, TypeOfUser.Tenants])(
        'does not restrict %s by the super-admin flag',
        (section) => {
            expect(canManageSectionActions(section, false)).toBe(true);
        },
    );
});
