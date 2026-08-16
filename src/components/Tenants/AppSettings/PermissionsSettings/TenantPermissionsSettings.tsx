import { useCallback, useMemo, useState } from 'react';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import {
    useTenantPermissionPolicies,
    useTenantPermissionPoliciesMutation,
} from '../../../../hooks/useTenantPermissionPolicies';
import { buildTogglePayload } from './permissionsToggleLogic';
import {
    applyPermissionConstraintsToSettings,
    DEFAULT_PERMISSION_SETTINGS,
    getRestrictedFields,
} from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';
import type { PolicyValue } from '../../../../types/permissionPolicy';

export const TenantPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { data: tenantData, isLoading } = useSingleTenantData({ id: tenantId });
    const { data: permissionPolicyData, isLoading: policiesLoading } = useTenantPermissionPolicies(tenantId);
    const updatePermissionPolicies = useTenantPermissionPoliciesMutation(tenantId);
    const [pendingPolicyField, setPendingPolicyField] = useState<string | null>(null);
    const { mutate: updateTenantSettings } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    const allowedPermissionToggles = tenantData?.settings?.tenantAdminControls?.allowedPermissionToggles;
    const enforcedPermissionToggles = tenantData?.settings?.tenantAdminControls?.enforcedPermissionToggles;
    const restrictedFields = useMemo(
        () => getRestrictedFields(allowedPermissionToggles, enforcedPermissionToggles),
        [allowedPermissionToggles, enforcedPermissionToggles],
    );

    const initialValues = useMemo(
        () => ({
            ...tenantData,
            settings: {
                ...DEFAULT_PERMISSION_SETTINGS,
                ...applyPermissionConstraintsToSettings(
                    tenantData?.settings ?? {},
                    allowedPermissionToggles,
                    enforcedPermissionToggles,
                ),
            },
        }),
        [tenantData, allowedPermissionToggles, enforcedPermissionToggles],
    );

    const formStateKey = useMemo(() => Array.from(restrictedFields).sort().join('|'), [restrictedFields]);

    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value, currentFormData) => {
            if (!tenantData) return;

            const toggleUpdate = buildTogglePayload(fieldPath, value) as { settings?: Record<string, boolean> };
            updateTenantSettings({
                settings: applyPermissionConstraintsToSettings(
                    {
                        ...tenantData.settings,
                        ...(currentFormData?.settings ?? {}),
                        ...toggleUpdate.settings,
                    },
                    allowedPermissionToggles,
                    enforcedPermissionToggles,
                ),
            });
        },
        [tenantData, updateTenantSettings, allowedPermissionToggles, enforcedPermissionToggles],
    );

    const handleSave = useCallback(
        (formData: unknown) => {
            const savedFormData = formData as { settings?: Record<string, unknown> };
            updateTenantSettings({
                settings: applyPermissionConstraintsToSettings(
                    savedFormData.settings,
                    allowedPermissionToggles,
                    enforcedPermissionToggles,
                ),
            });
        },
        [updateTenantSettings, allowedPermissionToggles, enforcedPermissionToggles],
    );

    const handlePolicyChange = useCallback(
        (fieldKey: string, policy: PolicyValue<boolean>) => {
            if (!permissionPolicyData) return;
            setPendingPolicyField(fieldKey);
            updatePermissionPolicies.mutate(
                {
                    ...permissionPolicyData,
                    policies: { ...permissionPolicyData.policies, [fieldKey]: policy },
                },
                { onSettled: () => setPendingPolicyField(null) },
            );
        },
        [permissionPolicyData, updatePermissionPolicies],
    );

    return (
        <PermissionsSettingsView
            tenantId={tenantId}
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading || policiesLoading}
            initialValues={initialValues}
            formStateKey={formStateKey}
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            onSave={handleSave}
            policyLevel="tenant"
            permissionPolicies={permissionPolicyData?.policies}
            pendingPolicyField={pendingPolicyField}
            onPolicyChange={handlePolicyChange}
        />
    );
};
