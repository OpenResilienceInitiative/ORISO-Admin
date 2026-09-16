import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import type { PermissionsSettingsCommonArgs } from './types';

interface PermissionsSettingsArgs extends PermissionsSettingsCommonArgs {
    superAdminControlMode?: boolean;
}

export const PermissionsSettings = ({ superAdminControlMode = false, ...props }: PermissionsSettingsArgs) =>
    superAdminControlMode ? <SuperAdminPermissionsSettings {...props} /> : <TenantPermissionsSettings {...props} />;
