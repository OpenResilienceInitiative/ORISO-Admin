import { useCallback, useMemo } from 'react';
import { useAgencyData } from '../../../../hooks/useAgencyData';
import { useAgencyUpdate } from '../../../../hooks/useAgencyUpdate';
import { buildTogglePayload } from './permissionsToggleLogic';
import { applyForcedOffFields, DEFAULT_PERMISSION_SETTINGS, getForcedOffFields } from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { ChatTypeCardKey, ToggleAfterChangeHandler } from './types';

type AgencyPermissionsSettingsProps = {
    agencyId: string;
    excludeCardKeys?: Array<ChatTypeCardKey>;
    superAdminMode?: boolean;
};

export const AgencyPermissionsSettings = ({
    agencyId,
    excludeCardKeys,
    superAdminMode = false,
}: AgencyPermissionsSettingsProps) => {
    const { data: agencyData, isLoading } = useAgencyData({ id: agencyId });
    const { mutate: updateAgency } = useAgencyUpdate(agencyId);

    const allowedPermissionToggles = agencyData?.settings?.agencyAdminControls?.allowedPermissionToggles;
    const restrictedFields = useMemo(
        () => (superAdminMode ? new Set<string>() : getForcedOffFields(allowedPermissionToggles)),
        [superAdminMode, allowedPermissionToggles],
    );

    const initialValues = useMemo(
        () => ({
            settings: {
                ...DEFAULT_PERMISSION_SETTINGS,
                ...applyForcedOffFields(agencyData?.settings, restrictedFields),
            },
        }),
        [agencyData?.settings, restrictedFields],
    );

    const formStateKey = useMemo(
        () =>
            [agencyId, superAdminMode ? 'super-admin' : 'agency-admin', ...Array.from(restrictedFields).sort()].join(
                '|',
            ),
        [agencyId, superAdminMode, restrictedFields],
    );

    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value, currentFormData) => {
            if (!agencyData) return;

            const toggleUpdate = buildTogglePayload(fieldPath, value) as { settings?: Record<string, boolean> };
            updateAgency({
                settings: applyForcedOffFields(
                    {
                        ...agencyData.settings,
                        ...(currentFormData?.settings ?? {}),
                        ...toggleUpdate.settings,
                    },
                    restrictedFields,
                ),
            });
        },
        [agencyData, restrictedFields, updateAgency],
    );

    const handleSave = useCallback(
        (formData: unknown) => {
            const savedFormData = formData as { settings?: Record<string, unknown> };
            updateAgency({
                settings: applyForcedOffFields(
                    {
                        ...agencyData?.settings,
                        ...savedFormData.settings,
                    },
                    restrictedFields,
                ),
            });
        },
        [agencyData?.settings, updateAgency, restrictedFields],
    );

    return (
        <PermissionsSettingsView
            tenantId={`agency-${agencyId}`}
            disableSubTogglesWhenMasterOff={!superAdminMode}
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
