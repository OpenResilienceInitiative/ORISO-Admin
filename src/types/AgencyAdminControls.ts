import { AgencyAdminAllowedPermissionToggles } from './AgencyAdminAllowedPermissionToggles';

export type AgencyAdminControls = {
    permissionsPageEnabled?: boolean | null;
    allowedPermissionToggles?: AgencyAdminAllowedPermissionToggles;
};
