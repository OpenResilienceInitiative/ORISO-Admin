import { describe, it, expect } from 'vitest';
import { USER_TABLE_CONFIGS } from './userTableConfigs';
import { TypeOfUser } from '../../../enums/TypeOfUser';
import { mapSorterToApiField } from './useUserTableColumns';

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

describe('userTableConfigs sort contract: an arrow only where the server can sort', () => {
    // Literal copy of the `field` enums in ORISO-UserService api/useradminservice.yaml and
    // api/userservice.yaml (origin/dev, 2026-09-25). USERNAME is not sortable on any endpoint.
    const SERVER_SORT_FIELDS: Partial<Record<TypeOfUser, string[]>> = {
        [TypeOfUser.Consultants]: ['FIRSTNAME', 'LASTNAME', 'EMAIL', 'UPDATE_DATE'],
        [TypeOfUser.AgencyAdmins]: ['FIRSTNAME', 'LASTNAME', 'EMAIL', 'UPDATE_DATE'],
        [TypeOfUser.TenantAdmins]: ['FIRSTNAME', 'LASTNAME', 'EMAIL', 'TENANT_ID', 'UPDATE_DATE'],
        [TypeOfUser.PlatformAdmins]: ['FIRSTNAME', 'LASTNAME', 'EMAIL', 'TENANT_ID', 'UPDATE_DATE'],
    };

    it.each(Object.keys(SERVER_SORT_FIELDS) as TypeOfUser[])(
        'every sortable column on %s is a server sort field',
        (sectionId) => {
            const sortableFields = USER_TABLE_CONFIGS[sectionId].columns
                .filter((column) => column.sortable)
                .map((column) => mapSorterToApiField(column.key));
            expect(sortableFields.filter((field) => !SERVER_SORT_FIELDS[sectionId]?.includes(field ?? ''))).toEqual([]);
        },
    );
});
