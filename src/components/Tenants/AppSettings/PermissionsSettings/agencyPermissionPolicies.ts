import type { AgencySettings } from '../../../../types/agency';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { stripAgencyAdminControls } from '../../../../api/agency/stripAgencyAdminControls';
import {
    applyPermissionConstraintsToSettings,
    getRestrictedFields,
    platformPresetValues,
    resolvePermissionPolicy,
} from './permissionsSettingsUtils';

/**
 * Effective policy per field for a Beratungsstelle (ORISO-TenantService#363): a lock from the
 * Träger wins, then the centre's own stored boolean, and only then the Träger's suggestion.
 */
export const agencyPermissionPolicies = (settings: AgencySettings = {}): Record<string, PolicyValue<boolean>> => {
    const controls = settings.agencyAdminControls;
    const restricted = getRestrictedFields(controls?.allowedPermissionToggles, controls?.enforcedPermissionToggles);
    const own = stripAgencyAdminControls(settings) as Record<string, unknown>;
    const values = applyPermissionConstraintsToSettings(
        { ...platformPresetValues(controls), ...own },
        controls?.allowedPermissionToggles,
        controls?.enforcedPermissionToggles,
    ) as Record<string, unknown>;
    const backend = settings.permissionPolicies;
    const fields = new Set([
        ...Object.keys(values ?? {}).filter((field) => typeof values[field] === 'boolean'),
        ...Object.keys(backend ?? {}),
    ]);
    return Object.fromEntries(
        [...fields].map((field) => [
            field,
            resolvePermissionPolicy(backend, field, values?.[field], restricted, own[field]),
        ]),
    );
};
