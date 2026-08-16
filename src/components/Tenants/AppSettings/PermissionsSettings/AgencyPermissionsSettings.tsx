import { notification } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyData } from '../../../../hooks/useAgencyData';
import { useAgencyUpdate } from '../../../../hooks/useAgencyUpdate';
import { stripAgencyAdminControls } from '../../../../api/agency/stripAgencyAdminControls';
import { buildTogglePayload } from './permissionsToggleLogic';
import {
    applyPermissionConstraintsToSettings,
    DEFAULT_PERMISSION_SETTINGS,
    getRestrictedFields,
} from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { ChatTypeCardKey, ToggleAfterChangeHandler } from './types';

type AgencyPermissionsSettingsProps = {
    agencyId: string;
    excludeCardKeys?: Array<ChatTypeCardKey>;
};

/**
 * Agency-scoped sibling of {@link TenantPermissionsSettings}: edits the feature toggles stored in
 * the agency's own `settings` JSON. The platform's `agencyAdminControls` (injected into the GET
 * response) only constrain the form — forced-off and enforced-on fields render disabled, never
 * hidden — and are stripped from every save payload at the API layer.
 */
export const AgencyPermissionsSettings = ({ agencyId, excludeCardKeys }: AgencyPermissionsSettingsProps) => {
    const { t } = useTranslation();
    const { data: agencyData, isLoading } = useAgencyData({ id: agencyId });
    const { mutate: updateAgency } = useAgencyUpdate(agencyId);
    const [pendingPolicyFields, setPendingPolicyFields] = useState<ReadonlySet<string>>(new Set());

    const allowedPermissionToggles = agencyData?.settings?.agencyAdminControls?.allowedPermissionToggles;
    const enforcedPermissionToggles = agencyData?.settings?.agencyAdminControls?.enforcedPermissionToggles;
    const restrictedFields = useMemo(
        () => getRestrictedFields(allowedPermissionToggles, enforcedPermissionToggles),
        [allowedPermissionToggles, enforcedPermissionToggles],
    );

    const initialValues = useMemo(
        () => ({
            settings: {
                ...DEFAULT_PERMISSION_SETTINGS,
                ...applyPermissionConstraintsToSettings(
                    stripAgencyAdminControls(agencyData?.settings ?? {}),
                    allowedPermissionToggles,
                    enforcedPermissionToggles,
                ),
            },
        }),
        [agencyData, allowedPermissionToggles, enforcedPermissionToggles],
    );

    const formStateKey = useMemo(() => Array.from(restrictedFields).sort().join('|'), [restrictedFields]);
    const saveSettings = useCallback(
        (settings: Record<string, unknown> | undefined, policyField?: string) => {
            if (policyField) setPendingPolicyFields(new Set([policyField]));
            updateAgency(
                {
                    settings: applyPermissionConstraintsToSettings(
                        settings,
                        allowedPermissionToggles,
                        enforcedPermissionToggles,
                    ),
                },
                {
                    onSuccess: () => {
                        notification.success({ message: t('message.agency.updated'), duration: 3 });
                    },
                    onError: () => notification.error({ message: t('tenants.permissions.policy.saveError') }),
                    onSettled: () => {
                        if (policyField) setPendingPolicyFields(new Set());
                    },
                },
            );
        },
        [updateAgency, allowedPermissionToggles, enforcedPermissionToggles, t],
    );

    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value, currentFormData) => {
            if (!agencyData) return;

            const fieldKey = Array.isArray(fieldPath) ? fieldPath.at(-1) : fieldPath;
            const toggleUpdate = buildTogglePayload(fieldPath, value) as { settings?: Record<string, boolean> };
            saveSettings(
                {
                    ...stripAgencyAdminControls(agencyData.settings ?? {}),
                    ...(currentFormData?.settings ?? {}),
                    ...toggleUpdate.settings,
                },
                fieldKey,
            );
        },
        [agencyData, saveSettings],
    );

    return (
        <PermissionsSettingsView
            tenantId={`agency-${agencyId}`}
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading}
            initialValues={initialValues}
            formStateKey={formStateKey}
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            policyLevel="agency"
            pendingPolicyFields={pendingPolicyFields}
        />
    );
};
