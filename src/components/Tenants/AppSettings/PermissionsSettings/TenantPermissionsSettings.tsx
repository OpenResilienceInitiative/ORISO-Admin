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
    const pendingPolicyOperations = useRef<
        { id: number; tenantId: string; fieldKey: string; policy: PolicyValue<boolean> }[]
    >([]);
    const nextPolicyOperationId = useRef(0);
    const policyMutationQueue = useRef<Promise<void>>(Promise.resolve());
    const activeTenantId = useRef(tenantId);
    const { mutate: updateTenantSettings } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });

    useEffect(() => {
        activeTenantId.current = tenantId;
        pendingPolicyOperations.current = [];
        policyMutationQueue.current = Promise.resolve();
        const matchingPolicyData =
            permissionPolicyData && String(permissionPolicyData.tenantId) === tenantId
                ? permissionPolicyData
                : undefined;
        confirmedPolicyData.current = matchingPolicyData;
        setEffectivePolicyData(matchingPolicyData);
        setPendingPolicyFields(new Set());
    }, [tenantId]);

    useEffect(() => {
        if (
            permissionPolicyData &&
            String(permissionPolicyData.tenantId) === tenantId &&
            pendingPolicyOperations.current.length === 0
        ) {
            confirmedPolicyData.current = permissionPolicyData;
            setEffectivePolicyData(permissionPolicyData);
        }
    }, [permissionPolicyData, tenantId]);

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

    const handlePolicyChange = useCallback(
        (fieldKey: string, policy: PolicyValue<boolean>) => {
            if (!confirmedPolicyData.current) return;
            if (String(confirmedPolicyData.current.tenantId) !== tenantId) return;
            const operation = { id: nextPolicyOperationId.current, tenantId, fieldKey, policy };
            nextPolicyOperationId.current += 1;
            pendingPolicyOperations.current.push(operation);
            rebuildEffectivePolicyData();
            const run = async () => {
                if (activeTenantId.current !== operation.tenantId) return;
                const confirmed = confirmedPolicyData.current;
                if (!confirmed || String(confirmed.tenantId) !== operation.tenantId) return;
                const next = {
                    ...confirmed,
                    policies: { ...confirmed.policies, [fieldKey]: policy },
                };
                try {
                    const saved = await updatePermissionPolicies.mutateAsync(next);
                    if (activeTenantId.current === operation.tenantId) {
                        confirmedPolicyData.current = saved;
                    }
                } catch {
                    // The mutation hook reports the error. Only confirmed server data is retained here.
                } finally {
                    if (activeTenantId.current === operation.tenantId) {
                        pendingPolicyOperations.current = pendingPolicyOperations.current.filter(
                            ({ id }) => id !== operation.id,
                        );
                        rebuildEffectivePolicyData();
                    }
                }
            };
            policyMutationQueue.current = policyMutationQueue.current.then(run, run);
        },
        [rebuildEffectivePolicyData, tenantId, updatePermissionPolicies],
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
            policyLevel="tenant"
            permissionPolicies={effectivePolicyData?.policies}
            pendingPolicyFields={pendingPolicyFields}
            onPolicyChange={handlePolicyChange}
        />
    );
};
