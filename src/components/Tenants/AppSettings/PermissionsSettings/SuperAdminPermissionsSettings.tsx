import { useCallback, useMemo, useState } from 'react';
import { useTenantAdminControls } from '../../../../hooks/useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from '../../../../hooks/useTenantAdminControlsMutation.hook';
import { buildTogglePayload } from './permissionsToggleLogic';
import { applyVisibleTogglesAsValues, buildTenantAdminControlsPayload } from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';
import type { PolicyValue } from '../../../../types/permissionPolicy';

export const SuperAdminPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { data: platformControls, isLoading } = useTenantAdminControls(true);
    const [pendingPolicyField, setPendingPolicyField] = useState<string | null>(null);
    const { mutate: updateTenantAdminControls } = useTenantAdminControlsMutation({ successMessageKey: false });

    const allowedPermissionToggles = platformControls?.allowedPermissionToggles;
    const enforcedPermissionToggles = platformControls?.enforcedPermissionToggles;
    const restrictedFields = useMemo(() => new Set<string>(), []);

    const persistPlatformControls = useCallback(
        (formData: { settings?: Record<string, unknown> }) => {
            updateTenantAdminControls(
                buildTenantAdminControlsPayload(
                    formData,
                    allowedPermissionToggles,
                    platformControls?.permissionsPageEnabled ?? true,
                    enforcedPermissionToggles,
                ),
            );
        },
        [
            updateTenantAdminControls,
            allowedPermissionToggles,
            platformControls?.permissionsPageEnabled,
            enforcedPermissionToggles,
        ],
    );

    const handlePolicyChange = useCallback(
        (fieldKey: string, policy: PolicyValue<boolean>) => {
            if (!platformControls) return;
            setPendingPolicyField(fieldKey);
            updateTenantAdminControls(
                {
                    ...platformControls,
                    permissionPolicies: { ...platformControls.permissionPolicies, [fieldKey]: policy },
                },
                { onSettled: () => setPendingPolicyField(null) },
            );
        },
        [platformControls, updateTenantAdminControls],
    );

    const initialValues = useMemo(
        () => ({
            settings: applyVisibleTogglesAsValues(allowedPermissionToggles),
        }),
        [allowedPermissionToggles],
    );

    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value, currentFormData) => {
            const toggleUpdate = buildTogglePayload(fieldPath, value) as { settings?: Record<string, boolean> };
            persistPlatformControls({
                settings: {
                    ...applyVisibleTogglesAsValues(allowedPermissionToggles),
                    ...(currentFormData?.settings ?? {}),
                    ...toggleUpdate.settings,
                },
            });
        },
        [allowedPermissionToggles, persistPlatformControls],
    );

    const handleSave = useCallback(
        (formData: unknown) => {
            persistPlatformControls(formData as { settings?: Record<string, unknown> });
        },
        [persistPlatformControls],
    );

    return (
        <PermissionsSettingsView
            tenantId={tenantId}
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading}
            initialValues={initialValues}
            formStateKey="platform"
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            onSave={handleSave}
            policyLevel="platform"
            permissionPolicies={platformControls?.permissionPolicies}
            pendingPolicyField={pendingPolicyField}
            onPolicyChange={handlePolicyChange}
        />
    );
};
