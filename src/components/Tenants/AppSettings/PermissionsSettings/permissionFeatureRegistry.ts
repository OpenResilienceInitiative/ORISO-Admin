import type { PolicyValue } from '../../../../types/permissionPolicy';
import { DEFAULT_PERMISSION_SETTINGS, PLATFORM_TOGGLE_FIELDS } from './permissionsSettingsUtils';

/**
 * Every feature whose value is a permission policy (ORISO-TenantService#363). The defaults list is
 * the registry; `permissionFeatureRegistry.test.ts` fails when another hand-kept list drifts from it.
 * These keys are written only through `/tenantadmin/{id}/permission-policies`, never as raw settings.
 */
export const PERMISSION_FEATURE_KEYS: ReadonlySet<string> = new Set([
    ...Object.keys(DEFAULT_PERMISSION_SETTINGS),
    ...Object.values(PLATFORM_TOGGLE_FIELDS).flat(),
]);

export const isPermissionFeature = (field: string) => PERMISSION_FEATURE_KEYS.has(field);

/**
 * Splits a tenant settings save: permission features that changed become own policies
 * (`inherited: false`, keeping an own requirement), everything else stays a settings write.
 */
export const splitPermissionFeatureWrites = (
    settings: Record<string, unknown> | undefined,
    effectiveValues: Record<string, boolean>,
    policies: Record<string, PolicyValue<boolean>> | undefined,
) => {
    const rest: Record<string, unknown> = {};
    const changed: Record<string, PolicyValue<boolean>> = {};
    Object.entries(settings ?? {}).forEach(([field, value]) => {
        if (!isPermissionFeature(field)) {
            rest[field] = value;
            return;
        }
        if (typeof value === 'boolean' && value !== effectiveValues[field]) {
            const current = policies?.[field];
            const mode = current && current.inherited !== true ? current.mode : 'SUGGESTED';
            changed[field] = { value, mode, inherited: false };
        }
    });
    return { rest, changed };
};
