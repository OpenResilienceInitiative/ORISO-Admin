import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenantAdminControls } from '../../../../hooks/useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from '../../../../hooks/useTenantAdminControlsMutation.hook';
import { buildTogglePayload } from './permissionsToggleLogic';
import {
    applyVisibleTogglesAsValues,
    buildTenantAdminControlsPayload,
    enforcedFieldsToToggles,
    getEnforcedOnFields,
} from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import { EnforceModeSwitch } from './EnforceModeSwitch';
import type { EnforceChangeHandler, PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';

export const SuperAdminPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { data: platformControls, isLoading } = useTenantAdminControls(true);
    const { mutate: updateTenantAdminControls } = useTenantAdminControlsMutation({ successMessageKey: false });
    // Defaults to plain "Configure" mode — the enforce checkboxes used to render permanently;
    // see ORISO-Admin#297.
    const [enforceMode, setEnforceMode] = useState(false);

    const allowedPermissionToggles = platformControls?.allowedPermissionToggles;
    const enforcedPermissionToggles = platformControls?.enforcedPermissionToggles;
    const restrictedFields = useMemo(() => new Set<string>(), []);

    // Which features the platform has locked on for tenants. Seeded from the server, then edited
    // locally via the enforce checkboxes.
    const [enforcedFields, setEnforcedFields] = useState<Set<string>>(new Set());
    useEffect(() => {
        setEnforcedFields(getEnforcedOnFields(enforcedPermissionToggles));
    }, [enforcedPermissionToggles]);

    const persistPlatformControls = useCallback(
        (formData: { settings?: Record<string, unknown> }, nextEnforcedFields: Set<string> = enforcedFields) => {
            updateTenantAdminControls(
                buildTenantAdminControlsPayload(
                    formData,
                    allowedPermissionToggles,
                    platformControls?.permissionsPageEnabled ?? true,
                    enforcedFieldsToToggles(nextEnforcedFields),
                ),
            );
        },
        [updateTenantAdminControls, allowedPermissionToggles, platformControls?.permissionsPageEnabled, enforcedFields],
    );

    const handleEnforceChange = useCallback<EnforceChangeHandler>(
        (fieldKey, enforced) => {
            const next = new Set(enforcedFields);
            if (enforced) {
                next.add(fieldKey);
            } else {
                next.delete(fieldKey);
            }
            setEnforcedFields(next);
            persistPlatformControls({ settings: applyVisibleTogglesAsValues(allowedPermissionToggles) }, next);
        },
        [enforcedFields, allowedPermissionToggles, persistPlatformControls],
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
        <>
            <EnforceModeSwitch enforceMode={enforceMode} onChange={setEnforceMode} />
            <PermissionsSettingsView
                tenantId={tenantId}
                excludeCardKeys={excludeCardKeys}
                isLoading={isLoading}
                initialValues={initialValues}
                formStateKey="platform"
                restrictedFields={restrictedFields}
                onToggleUpdate={handleToggleUpdate}
                onSave={handleSave}
                enforceMode={enforceMode}
                enforcedFields={enforcedFields}
                onEnforceChange={handleEnforceChange}
            />
        </>
    );
};
