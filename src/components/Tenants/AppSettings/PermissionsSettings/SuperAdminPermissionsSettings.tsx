import { useCallback, useMemo } from 'react';
import { useAgencyAdminControls } from '../../../../hooks/useAgencyAdminControls.hook';
import { useAgencyAdminControlsMutation } from '../../../../hooks/useAgencyAdminControlsMutation.hook';
import { useTenantAdminControls } from '../../../../hooks/useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from '../../../../hooks/useTenantAdminControlsMutation.hook';
import { buildTogglePayload } from './permissionsToggleLogic';
import {
    buildAgencyAdminControlsPayload,
    applyVisibleTogglesAsValues,
    buildTenantAdminControlsPayload,
} from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';

export const SuperAdminPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { data: platformControls, isLoading: isLoadingTenantControls } = useTenantAdminControls(true);
    const { data: agencyPlatformControls, isLoading: isLoadingAgencyControls } = useAgencyAdminControls(true);
    const { mutate: updateTenantAdminControls } = useTenantAdminControlsMutation({ successMessageKey: false });
    const { mutate: updateAgencyAdminControls } = useAgencyAdminControlsMutation({ successMessageKey: false });

    const allowedPermissionToggles = platformControls?.allowedPermissionToggles;
    const restrictedFields = useMemo(() => new Set<string>(), []);

    const persistPlatformControls = useCallback(
        (formData: { settings?: Record<string, unknown> }) => {
            updateTenantAdminControls(
                buildTenantAdminControlsPayload(
                    formData,
                    allowedPermissionToggles,
                    platformControls?.permissionsPageEnabled ?? true,
                ),
            );
            updateAgencyAdminControls(
                buildAgencyAdminControlsPayload(
                    formData,
                    agencyPlatformControls?.allowedPermissionToggles,
                    agencyPlatformControls?.permissionsPageEnabled ?? true,
                ),
            );
        },
        [
            updateTenantAdminControls,
            updateAgencyAdminControls,
            allowedPermissionToggles,
            platformControls?.permissionsPageEnabled,
            agencyPlatformControls?.allowedPermissionToggles,
            agencyPlatformControls?.permissionsPageEnabled,
        ],
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
            tenantId={tenantId || 'platform'}
            disableSubTogglesWhenMasterOff={false}
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoadingTenantControls || isLoadingAgencyControls}
            initialValues={initialValues}
            formStateKey="platform"
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            onSave={handleSave}
        />
    );
};
