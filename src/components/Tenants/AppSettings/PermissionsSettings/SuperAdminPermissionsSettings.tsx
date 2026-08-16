import { notification } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenantAdminControls } from '../../../../hooks/useTenantAdminControls.hook';
import { useTenantAdminControlsMutation } from '../../../../hooks/useTenantAdminControlsMutation.hook';
import { buildTogglePayload } from './permissionsToggleLogic';
import { applyVisibleTogglesAsValues, buildTenantAdminControlsPayload } from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';
import type { PolicyValue } from '../../../../types/permissionPolicy';
import type { TenantAdminControls } from '../../../../types/TenantAdminControls';

export const SuperAdminPermissionsSettings = ({ tenantId, excludeCardKeys }: PermissionsSettingsCommonArgs) => {
    const { t } = useTranslation();
    const { data: platformControls, isLoading } = useTenantAdminControls(true);
    const [pendingPolicyFields, setPendingPolicyFields] = useState<ReadonlySet<string>>(new Set());
    const [effectivePlatformControls, setEffectivePlatformControls] = useState<TenantAdminControls | undefined>(
        platformControls,
    );
    const confirmedPlatformControls = useRef<TenantAdminControls | undefined>(platformControls);
    const pendingPolicyOperations = useRef<{ id: number; fieldKey: string; policy: PolicyValue<boolean> }[]>([]);
    const nextPolicyOperationId = useRef(0);
    const policyMutationQueue = useRef<Promise<void>>(Promise.resolve());
    const updateTenantAdminControls = useTenantAdminControlsMutation({
        successMessageKey: false,
        onError: () => notification.error({ message: t('tenants.permissions.policy.saveError') }),
    });

    useEffect(() => {
        if (platformControls && pendingPolicyOperations.current.length === 0) {
            confirmedPlatformControls.current = platformControls;
            setEffectivePlatformControls(platformControls);
        }
    }, [platformControls]);

    const rebuildEffectivePlatformControls = useCallback(() => {
        const confirmed = confirmedPlatformControls.current;
        if (!confirmed) return;
        const permissionPolicies = pendingPolicyOperations.current.reduce(
            (current, operation) => ({ ...current, [operation.fieldKey]: operation.policy }),
            { ...confirmed.permissionPolicies },
        );
        setEffectivePlatformControls({ ...confirmed, permissionPolicies });
        setPendingPolicyFields(new Set(pendingPolicyOperations.current.map(({ fieldKey }) => fieldKey)));
    }, []);

    const allowedPermissionToggles = platformControls?.allowedPermissionToggles;
    const enforcedPermissionToggles = platformControls?.enforcedPermissionToggles;
    const restrictedFields = useMemo(() => new Set<string>(), []);

    const persistPlatformControls = useCallback(
        (formData: { settings?: Record<string, unknown> }) => {
            updateTenantAdminControls.mutate(
                buildTenantAdminControlsPayload(
                    formData,
                    allowedPermissionToggles,
                    platformControls?.permissionsPageEnabled ?? true,
                    enforcedPermissionToggles,
                ),
            );
        },
        [
            updateTenantAdminControls.mutate,
            allowedPermissionToggles,
            platformControls?.permissionsPageEnabled,
            enforcedPermissionToggles,
        ],
    );

    const handlePolicyChange = useCallback(
        (fieldKey: string, policy: PolicyValue<boolean>) => {
            if (!confirmedPlatformControls.current) return;
            const operation = { id: nextPolicyOperationId.current, fieldKey, policy };
            nextPolicyOperationId.current += 1;
            pendingPolicyOperations.current.push(operation);
            rebuildEffectivePlatformControls();
            const run = async () => {
                const confirmed = confirmedPlatformControls.current;
                if (!confirmed) return;
                const next = {
                    ...confirmed,
                    permissionPolicies: { ...confirmed.permissionPolicies, [fieldKey]: policy },
                };
                try {
                    confirmedPlatformControls.current = await updateTenantAdminControls.mutateAsync(next);
                } catch {
                    // The mutation hook reports the error. Rebuild below rolls back this operation only.
                } finally {
                    pendingPolicyOperations.current = pendingPolicyOperations.current.filter(
                        ({ id }) => id !== operation.id,
                    );
                    rebuildEffectivePlatformControls();
                }
            };
            policyMutationQueue.current = policyMutationQueue.current.then(run, run);
        },
        [rebuildEffectivePlatformControls, updateTenantAdminControls],
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

    return (
        <PermissionsSettingsView
            tenantId={tenantId}
            excludeCardKeys={excludeCardKeys}
            isLoading={isLoading}
            initialValues={initialValues}
            formStateKey="platform"
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            policyLevel="platform"
            permissionPolicies={effectivePlatformControls?.permissionPolicies}
            pendingPolicyFields={pendingPolicyFields}
            onPolicyChange={handlePolicyChange}
        />
    );
};
