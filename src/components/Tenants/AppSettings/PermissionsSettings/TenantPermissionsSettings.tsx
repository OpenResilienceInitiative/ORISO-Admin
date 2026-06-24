import { useCallback, useMemo } from 'react';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import { buildTogglePayload } from './permissionsToggleLogic';
import {
    applyForcedOffFields,
    DEFAULT_PERMISSION_SETTINGS,
    getForcedOffFields,
} from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';

export const TenantPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { data: tenantData, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate: updateTenantSettings } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    const allowedPermissionToggles = tenantData?.settings?.tenantAdminControls?.allowedPermissionToggles;
    const restrictedFields = useMemo(() => getForcedOffFields(allowedPermissionToggles), [allowedPermissionToggles]);

    const initialValues = useMemo(
        () => ({
            ...tenantData,
            settings: {
                ...DEFAULT_PERMISSION_SETTINGS,
                ...applyForcedOffFields(tenantData?.settings ?? {}, restrictedFields),
            },
        }),
        [tenantData, restrictedFields],
    );

    const formStateKey = useMemo(() => Array.from(restrictedFields).sort().join('|'), [restrictedFields]);

    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value, currentFormData) => {
            if (!tenantData) return;

            const toggleUpdate = buildTogglePayload(fieldPath, value) as { settings?: Record<string, boolean> };
            updateTenantSettings({
                settings: applyForcedOffFields(
                    {
                        ...tenantData.settings,
                        ...(currentFormData?.settings ?? {}),
                        ...toggleUpdate.settings,
                    },
                    restrictedFields,
                ),
            });
        },
        [tenantData, updateTenantSettings, restrictedFields],
    );

    const handleSave = useCallback(
        (formData: unknown) => {
            const savedFormData = formData as { settings?: Record<string, unknown> };
            updateTenantSettings({
                settings: applyForcedOffFields(savedFormData.settings, restrictedFields),
            });
        },
        [updateTenantSettings, restrictedFields],
    );

    return (
        <PermissionsSettingsView
            tenantId={tenantId}
            disableSubTogglesWhenMasterOff
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading}
            initialValues={initialValues}
            formStateKey={formStateKey}
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            onSave={handleSave}
        />
    );
};
