import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import type { PermissionsSettingsCommonArgs } from './types';

interface PermissionsSettingsArgs extends PermissionsSettingsCommonArgs {
    superAdminControlMode?: boolean;
    /** Platform view of one Träger: also show that Träger's stored values (ORISO-Admin#989). */
    showTraegerValues?: boolean;
}

export const PermissionsSettings = ({
    superAdminControlMode = false,
    showTraegerValues = false,
    ...props
}: PermissionsSettingsArgs) =>
    superAdminControlMode ? (
        <SuperAdminPermissionsSettings {...props} showTraegerValues={showTraegerValues} />
    ) : (
        <TenantPermissionsSettings {...props} />
    );
