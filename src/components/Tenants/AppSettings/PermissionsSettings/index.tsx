import { AgencyPermissionsSettings } from './AgencyPermissionsSettings';
import { SuperAdminPermissionsSettings } from './SuperAdminPermissionsSettings';
import { TenantPermissionsSettings } from './TenantPermissionsSettings';
import type { PermissionsSettingsCommonArgs, PermissionsSettingsMode } from './types';

interface PermissionsSettingsArgs extends PermissionsSettingsCommonArgs {
    mode?: PermissionsSettingsMode;
    superAdminControlMode?: boolean;
    /** When true, platform restrictions are not applied while editing tenant/agency permissions. */
    superAdminMode?: boolean;
}

export const PermissionsSettings = ({
    mode,
    superAdminControlMode = false,
    superAdminMode = false,
    ...props
}: PermissionsSettingsArgs) => {
    if (mode === 'agency') {
        if (!props.agencyId) {
            return null;
        }

        return (
            <AgencyPermissionsSettings
                agencyId={props.agencyId}
                excludeCardKeys={props.excludeCardKeys}
                superAdminMode={superAdminMode}
            />
        );
    }

    if (mode === 'superAdmin' || superAdminControlMode) {
        return <SuperAdminPermissionsSettings tenantId={props.tenantId} excludeCardKeys={props.excludeCardKeys} />;
    }

    return (
        <TenantPermissionsSettings
            tenantId={props.tenantId}
            excludeCardKeys={props.excludeCardKeys}
            superAdminMode={superAdminMode}
        />
    );
};
