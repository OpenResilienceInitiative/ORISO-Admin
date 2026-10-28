import { notification } from 'antd';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyData } from '../../../../hooks/useAgencyData';
import { useAgencyUpdate } from '../../../../hooks/useAgencyUpdate';
import { useTenantPermissionPolicies } from '../../../../hooks/useTenantPermissionPolicies';
import { stripAgencyAdminControls } from '../../../../api/agency/stripAgencyAdminControls';
import { useQueuedPermissionPolicies } from '../../../../hooks/useQueuedPermissionPolicies';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import { agencyPermissionPolicies } from './agencyPermissionPolicies';
import {
    applyPermissionConstraintsToSettings,
    getRestrictedFields,
    platformPresetValues,
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
    const { data: agencyData, isLoading, isPending } = useAgencyData({ id: agencyId });
    const { mutateAsync: updateAgency } = useAgencyUpdate(agencyId);
    // Channel switches are not stored per centre (AgencyService); show the Träger's, read-only.
    // A failed read (e.g. 403) says so on the tiles, without a toast — never defaults as the Träger's.
    const traegerId = agencyData?.tenantId ? String(agencyData.tenantId) : '';
    const { data: traegerPolicies, status: traegerPoliciesQueryStatus } = useTenantPermissionPolicies(
        traegerId,
        Boolean(traegerId),
        { silent: true },
    );
    let traegerPoliciesStatus = traegerPoliciesQueryStatus;
    if (isPending) traegerPoliciesStatus = 'pending';
    else if (!traegerId) traegerPoliciesStatus = 'error';

    const allowedPermissionToggles = agencyData?.settings?.agencyAdminControls?.allowedPermissionToggles;
    const enforcedPermissionToggles = agencyData?.settings?.agencyAdminControls?.enforcedPermissionToggles;
    const restrictedFields = useMemo(() => {
        const fields = getRestrictedFields(allowedPermissionToggles, enforcedPermissionToggles);
        Object.entries(agencyData?.settings?.permissionPolicies ?? {}).forEach(([field, policy]) => {
            if (policy.mode === 'ENFORCED') fields.add(field);
            else fields.delete(field);
        });
        return fields;
    }, [agencyData?.settings?.permissionPolicies, allowedPermissionToggles, enforcedPermissionToggles]);

    const initialValues = useMemo(
        () => ({
            settings: {
                // Unset field → platform/Träger preset, not a blanket "on" (ORISO-Admin#989).
                ...platformPresetValues({ allowedPermissionToggles }),
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
    const confirmedPolicies = useMemo(
        () => (agencyData ? agencyPermissionPolicies(agencyData.settings) : undefined),
        [agencyData],
    );
    const savePolicy = useCallback(
        async (field: string, policy: PolicyValue<boolean>) => {
            try {
                // A field patch lets the agency mutation queue merge into its latest confirmed response.
                const saved = await updateAgency({ settings: { [field]: policy.value } });
                notification.success({ message: t('message.agency.updated'), duration: 3 });
                return agencyPermissionPolicies(saved.settings);
            } catch (error) {
                notification.error({ message: t('tenants.permissions.policy.saveError') });
                throw error;
            }
        },
        [t, updateAgency],
    );
    const { policies, pendingFields, changePolicy } = useQueuedPermissionPolicies(
        agencyId,
        confirmedPolicies,
        savePolicy,
    );
    const handleToggleUpdate = useCallback<ToggleAfterChangeHandler>(
        (fieldPath, value) => {
            const field = Array.isArray(fieldPath) ? fieldPath.at(-1) : fieldPath;
            if (field) changePolicy(field, { value, mode: 'SUGGESTED', inherited: false });
        },
        [changePolicy],
    );

    return (
        <PermissionsSettingsView
            tenantId={`agency-${agencyId}`}
            caseHandoverTenantId={agencyData?.tenantId}
            caseHandoverTenantPending={isPending}
            channelsSetOnTraeger
            traegerChannelPolicies={traegerPolicies?.policies}
            traegerChannelPoliciesStatus={traegerPoliciesStatus}
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading}
            initialValues={initialValues}
            formStateKey={formStateKey}
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            policyLevel="agency"
            permissionPolicies={policies}
            onPolicyChange={changePolicy}
            pendingPolicyFields={pendingFields}
        />
    );
};
