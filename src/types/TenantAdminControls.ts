import { PermissionToggleVisibility } from './PermissionToggleVisibility';

export type TenantAdminControls = {
    permissionsPageEnabled?: boolean | null;
    allowedPermissionToggles?: PermissionToggleVisibility & {
        appearance?: boolean | null;
    };
    /** Per-feature flags an upper role locks on for lower roles (enforced-on). See ADR-013. */
    enforcedPermissionToggles?: PermissionToggleVisibility & {
        appearance?: boolean | null;
    };
};
