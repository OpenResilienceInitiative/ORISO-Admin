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
