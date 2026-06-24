import { describe, expect, it } from 'vitest';
import { mergeUserPermissions } from './userRolesToPermissions';

describe('mergeUserPermissions', () => {
    it('keeps broader agency grants when a user also has restricted agency admin', () => {
        const merged = mergeUserPermissions(
            {
                Agency: { read: true, create: true, update: true, delete: true },
                Statistic: { read: true },
            },
            {
                Agency: { read: true, create: false, update: true, delete: false },
                Statistic: { read: false },
            },
        );

        expect(merged.Agency).toEqual({ read: true, create: true, update: true, delete: true });
        expect(merged.Statistic?.read).toBe(true);
    });

    it('keeps user-admin grants when mixed with restricted agency admin', () => {
        const merged = mergeUserPermissions(
            {
                AgencyAdminUser: { read: true, create: true, update: true, delete: true },
            },
            {
                AgencyAdminUser: { read: false, create: false, update: false, delete: false },
            },
        );

        expect(merged.AgencyAdminUser).toEqual({ read: true, create: true, update: true, delete: true });
    });

    it('leaves an action denied when no role grants it', () => {
        const merged = mergeUserPermissions({
            Agency: { create: false },
        });

        expect(merged.Agency?.create).toBe(false);
    });
});
