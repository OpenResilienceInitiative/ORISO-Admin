import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
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
import type { PolicyValue, TenantPermissionPolicies } from '../../../../types/permissionPolicy';

export const TenantPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { t } = useTranslation();
    const { data: tenantData, isLoading } = useSingleTenantData({ id: tenantId });
    const {
        data: permissionPolicyData,
        isLoading: policiesLoading,
        isError: policiesError,
    } = useTenantPermissionPolicies(tenantId);
    const updatePermissionPolicies = useTenantPermissionPoliciesMutation(tenantId);
    const [pendingPolicyFields, setPendingPolicyFields] = useState<ReadonlySet<string>>(new Set());
    const [effectivePolicyData, setEffectivePolicyData] = useState<TenantPermissionPolicies | undefined>(
        permissionPolicyData,
    );
    const confirmedPolicyData = useRef<TenantPermissionPolicies | undefined>(permissionPolicyData);
    const pendingPolicyOperations = useRef<{ id: number; fieldKey: string; policy: PolicyValue<boolean> }[]>([]);
    const nextPolicyOperationId = useRef(0);
    const policyMutationQueue = useRef<Promise<void>>(Promise.resolve());
    const { mutate: updateTenantSettings } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    useEffect(() => {
        if (permissionPolicyData && pendingPolicyOperations.current.length === 0) {
            confirmedPolicyData.current = permissionPolicyData;
            setEffectivePolicyData(permissionPolicyData);
        }
    }, [permissionPolicyData]);

    const rebuildEffectivePolicyData = useCallback(() => {
        const confirmed = confirmedPolicyData.current;
        if (!confirmed) return;
        const policies = pendingPolicyOperations.current.reduce(
            (current, operation) => ({ ...current, [operation.fieldKey]: operation.policy }),
            { ...confirmed.policies },
        );
        setEffectivePolicyData({ ...confirmed, policies });
        setPendingPolicyFields(new Set(pendingPolicyOperations.current.map(({ fieldKey }) => fieldKey)));
    }, []);

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
            if (!confirmedPolicyData.current) return;
            const operation = { id: nextPolicyOperationId.current, fieldKey, policy };
            nextPolicyOperationId.current += 1;
            pendingPolicyOperations.current.push(operation);
            rebuildEffectivePolicyData();
            const run = async () => {
                const confirmed = confirmedPolicyData.current;
                if (!confirmed) return;
                const next = {
                    ...confirmed,
                    policies: { ...confirmed.policies, [fieldKey]: policy },
                };
                try {
                    const saved = await updatePermissionPolicies.mutateAsync(next);
                    confirmedPolicyData.current = saved;
                } catch {
                    // The mutation hook reports the error. Only confirmed server data is retained here.
                } finally {
                    pendingPolicyOperations.current = pendingPolicyOperations.current.filter(
                        ({ id }) => id !== operation.id,
                    );
                    rebuildEffectivePolicyData();
                }
            };
            policyMutationQueue.current = policyMutationQueue.current.then(run, run);
        },
        [rebuildEffectivePolicyData, updatePermissionPolicies],
    );

    if (policiesError) {
        return <Alert type="error" message={t('error.loading')} showIcon role="alert" />;
    }

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
            permissionPolicies={effectivePolicyData?.policies}
            pendingPolicyFields={pendingPolicyFields}
            onPolicyChange={handlePolicyChange}
        />
    );
};
