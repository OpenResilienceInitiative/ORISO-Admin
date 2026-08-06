import { describe, it, expect } from 'vitest';
import { USER_TABLE_CONFIGS } from './userTableConfigs';
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
