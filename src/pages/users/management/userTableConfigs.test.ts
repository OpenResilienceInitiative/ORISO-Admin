import { describe, it, expect } from 'vitest';
import { USER_TABLE_CONFIGS, getVisibleColumns, shouldShowTenantColumn } from './userTableConfigs';
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

describe('userTableConfigs Träger column', () => {
    const visibleKeys = (sectionId: TypeOfUser, isSuperAdmin: boolean) =>
        getVisibleColumns(sectionId, {
            showTenant: shouldShowTenantColumn(sectionId, isSuperAdmin),
            showSubdomain: false,
        }).map((column) => column.key);

    it('shows the Träger of each Träger admin to a platform admin', () => {
        expect(visibleKeys(TypeOfUser.TenantAdmins, true)).toContain('tenant');
    });

    it.each([TypeOfUser.Consultants, TypeOfUser.AgencyAdmins])(
        'keeps the Träger column for a platform admin on %s',
        (sectionId) => {
            expect(visibleKeys(sectionId, true)).toContain('tenant');
        },
    );

    it.each([TypeOfUser.TenantAdmins, TypeOfUser.Consultants, TypeOfUser.AgencyAdmins])(
        'hides the Träger column from a Träger admin on %s, who only sees their own Träger',
        (sectionId) => {
            expect(visibleKeys(sectionId, false)).not.toContain('tenant');
        },
    );
});
