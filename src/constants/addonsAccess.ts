import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import type { CanFn } from './caseHandoverAccess';

interface AddonsAccessContext {
    isSuperAdmin: boolean;
    can: CanFn;
}

/** Add-ons are Träger settings (ADR-032): whoever may change the Träger manages them. */
export const canSeeAddonsSection = ({ isSuperAdmin, can }: AddonsAccessContext): boolean =>
    isSuperAdmin || can(PermissionAction.Update, Resource.Tenant);

/** Only a SuperAdmin switches an add-on on or off for a whole Träger; Träger admins see the state. */
export const canSwitchAddonForTenant = ({ isSuperAdmin }: Pick<AddonsAccessContext, 'isSuperAdmin'>): boolean =>
    isSuperAdmin;
