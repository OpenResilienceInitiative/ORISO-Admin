import { describe, expect, it } from 'vite-plus/test';
import { canFor } from '../components/Layout/adminNavFixtures';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { canSeeAddonsSection, canSwitchAddonForTenant } from './addonsAccess';

describe('addonsAccess', () => {
    it('shows the section to SuperAdmins and admins who may change the Träger', () => {
        expect(canSeeAddonsSection({ isSuperAdmin: true, can: canFor() })).toBe(true);
        expect(
            canSeeAddonsSection({
                isSuperAdmin: false,
                can: canFor({ action: PermissionAction.Update, resource: Resource.Tenant }),
            }),
        ).toBe(true);
    });

    it('hides the section from admins who may only read the Träger or manage agencies', () => {
        expect(
            canSeeAddonsSection({
                isSuperAdmin: false,
                can: canFor({ action: PermissionAction.Read, resource: Resource.Tenant }, Resource.Agency),
            }),
        ).toBe(false);
    });

    it('lets only a SuperAdmin switch an add-on for a Träger', () => {
        expect(canSwitchAddonForTenant({ isSuperAdmin: true })).toBe(true);
        expect(canSwitchAddonForTenant({ isSuperAdmin: false })).toBe(false);
    });
});
