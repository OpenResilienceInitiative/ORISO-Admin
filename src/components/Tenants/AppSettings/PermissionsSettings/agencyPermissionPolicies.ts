import type { AgencySettings } from '../../../../types/agency';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { stripAgencyAdminControls } from '../../../../api/agency/stripAgencyAdminControls';
import {
    applyPermissionConstraintsToSettings,
    getRestrictedFields,
    platformPresetValues,
    resolvePermissionPolicy,
} from './permissionsSettingsUtils';

/** Typed effective policies take precedence; retain the pre-policy API compatibility path. */
export const agencyPermissionPolicies = (settings: AgencySettings = {}): Record<string, PolicyValue<boolean>> => {
    const controls = settings.agencyAdminControls;
    const restricted = getRestrictedFields(controls?.allowedPermissionToggles, controls?.enforcedPermissionToggles);
    const values = applyPermissionConstraintsToSettings(
        {
            ...platformPresetValues(controls),
            ...stripAgencyAdminControls(settings),
        },
        controls?.allowedPermissionToggles,
        controls?.enforcedPermissionToggles,
    );
    return {
        ...Object.fromEntries(
            Object.entries(values ?? {})
                .filter(([, value]) => typeof value === 'boolean')
                .map(([field, value]) => [field, resolvePermissionPolicy(undefined, field, value, restricted)]),
        ),
        ...settings.permissionPolicies,
    };
};
