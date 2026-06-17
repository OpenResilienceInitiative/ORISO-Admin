import { PermissionToggleVisibility } from './PermissionToggleVisibility';

export type TenantAdminControls = {
    permissionsPageEnabled?: boolean | null;
    allowedPermissionToggles?: PermissionToggleVisibility & {
        appearance?: boolean | null;
    };
};
