import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../../Snackbar';
import { useSingleTenantData } from '../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../hooks/useTenantAdminDataMutation.hook';
import {
    useTenantCalendarPoliciesMutation,
    useTenantPermissionPolicies,
    useTenantPermissionPoliciesMutation,
    useTenantRecipientScopeMutation,
} from '../../../../hooks/useTenantPermissionPolicies';
import { buildTogglePayload } from './permissionsToggleLogic';
import {
    applyPermissionConstraintsToSettings,
    getRestrictedFields,
    platformPresetValues,
} from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import { toRecipientScopeWrite } from './RecipientScope/recipientScopePolicy';
import { type CalendarPolicyChange, toCalendarWrite } from './Calendar/calendarPolicy';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';
import type { PolicyValue, RecipientScopePolicy, TenantPermissionPolicies } from '../../../../types/permissionPolicy';
import { Notify } from '../../../Notify';
import type { TraegerOnlySetting, TraegerOnlySettings } from './traegerFunctions';
import type { TenantAdminData } from '../../../../types/TenantAdminData';

export const TenantPermissionsSettings = ({
    tenantId,
    excludeCardKeys,
    liveChatLinks,
    introScopeNote,
}: PermissionsSettingsCommonArgs) => {
    const { t } = useTranslation();
    const { data: tenantData, isLoading } = useSingleTenantData({ id: tenantId });
    const {
        data: permissionPolicyData,
        isLoading: policiesLoading,
        isError: policiesError,
    } = useTenantPermissionPolicies(tenantId);
    const updatePermissionPolicies = useTenantPermissionPoliciesMutation(tenantId);
    const updateRecipientScope = useTenantRecipientScopeMutation(tenantId);
    const updateCalendar = useTenantCalendarPoliciesMutation(tenantId);
    const [pendingPolicyFields, setPendingPolicyFields] = useState<ReadonlySet<string>>(new Set());
    const [effectivePolicyData, setEffectivePolicyData] = useState<TenantPermissionPolicies | undefined>(
        permissionPolicyData,
    );
    const confirmedPolicyData = useRef<TenantPermissionPolicies | undefined>(permissionPolicyData);
    const pendingPolicyOperations = useRef<
        { id: number; tenantId: string; changes: Record<string, PolicyValue<boolean>> }[]
    >([]);
    const nextPolicyOperationId = useRef(0);
    const policyMutationQueue = useRef<Promise<void>>(Promise.resolve());
    const activeTenantId = useRef(tenantId);
    const tenantGeneration = useRef(0);
    const { mutate: updateTenantSettings } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    // ORISO-Admin#1577: follows the tiles in the background; the tile change already said "saved".
    const { mutateAsync: writeCallsAllowed } = useTenantAdminDataMutation({ id: tenantId, successMessageKey: null });
    const [pendingTraegerFields, setPendingTraegerFields] = useState<ReadonlySet<string>>(new Set());

    useEffect(() => {
        tenantGeneration.current += 1;
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
        return () => {
            tenantGeneration.current += 1;
        };
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
            (current, operation) => ({ ...current, ...operation.changes }),
            { ...confirmed.policies },
        );
        setEffectivePolicyData({ ...confirmed, policies });
        setPendingPolicyFields(new Set(pendingPolicyOperations.current.flatMap(({ changes }) => Object.keys(changes))));
    }, []);

    const allowedPermissionToggles = tenantData?.settings?.tenantAdminControls?.allowedPermissionToggles;
    const enforcedPermissionToggles = tenantData?.settings?.tenantAdminControls?.enforcedPermissionToggles;
    const restrictedFields = useMemo(
        () => getRestrictedFields(allowedPermissionToggles, enforcedPermissionToggles),
        [allowedPermissionToggles, enforcedPermissionToggles],
    );

    // An unset field takes the platform preset (initial preset ← allowed toggles ← resolved
    // policies), never a blanket "on" that could contradict the backend (ORISO-Admin#989). Read
    // from the query result, not the pending-aware copy: the form initialises in the same render
    // in which loading ends, one tick before the effect above copies the data over.
    const loadedPolicyData =
        permissionPolicyData && String(permissionPolicyData.tenantId) === tenantId ? permissionPolicyData : undefined;
    const loadedPolicies = loadedPolicyData?.policies;
    const presetValues = useMemo(
        () => platformPresetValues({ allowedPermissionToggles, permissionPolicies: loadedPolicies }),
        [allowedPermissionToggles, loadedPolicies],
    );

    const initialValues = useMemo(
        () => ({
            ...tenantData,
            settings: {
                ...presetValues,
                ...applyPermissionConstraintsToSettings(
                    tenantData?.settings ?? {},
                    allowedPermissionToggles,
                    enforcedPermissionToggles,
                ),
            },
        }),
        [tenantData, presetValues, allowedPermissionToggles, enforcedPermissionToggles],
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

    // Several fields in one operation are one request: they are saved, or rolled back, together (#1560).
    const handlePoliciesChange = useCallback(
        (changes: Record<string, PolicyValue<boolean>>) => {
            if (!confirmedPolicyData.current) return;
            if (String(confirmedPolicyData.current.tenantId) !== tenantId) return;
            const operation = { id: nextPolicyOperationId.current, tenantId, changes };
            const operationGeneration = tenantGeneration.current;
            nextPolicyOperationId.current += 1;
            pendingPolicyOperations.current.push(operation);
            rebuildEffectivePolicyData();
            const run = async () => {
                if (activeTenantId.current !== operation.tenantId || tenantGeneration.current !== operationGeneration)
                    return;
                const confirmed = confirmedPolicyData.current;
                if (!confirmed || String(confirmed.tenantId) !== operation.tenantId) return;
                const next = {
                    tenantId: confirmed.tenantId,
                    policies: changes,
                };
                try {
                    const saved = await updatePermissionPolicies.mutateAsync(next);
                    if (
                        activeTenantId.current === operation.tenantId &&
                        tenantGeneration.current === operationGeneration
                    ) {
                        confirmedPolicyData.current = saved;
                    }
                } catch {
                    // The mutation hook reports the error. Only confirmed server data is retained here.
                } finally {
                    if (
                        activeTenantId.current === operation.tenantId &&
                        tenantGeneration.current === operationGeneration
                    ) {
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
    const handlePolicyChange = useCallback(
        (fieldKey: string, policy: PolicyValue<boolean>) => handlePoliciesChange({ [fieldKey]: policy }),
        [handlePoliciesChange],
    );

    // Same queue as the switches, so a scope save and a switch save never overtake each other.
    const handleRecipientScopeSave = useCallback(
        (next: Pick<RecipientScopePolicy, 'value' | 'mode'>) => {
            const operationGeneration = tenantGeneration.current;
            const save = policyMutationQueue.current.then(async () => {
                const confirmed = confirmedPolicyData.current;
                if (
                    !confirmed ||
                    String(confirmed.tenantId) !== tenantId ||
                    activeTenantId.current !== tenantId ||
                    tenantGeneration.current !== operationGeneration
                ) {
                    throw new Error('Permission policies of this Träger are not loaded');
                }
                const saved = await updateRecipientScope.mutateAsync({
                    tenantId: confirmed.tenantId,
                    policies: {},
                    ...toRecipientScopeWrite({ ...next, inherited: false }),
                });
                if (activeTenantId.current !== tenantId || tenantGeneration.current !== operationGeneration) return;
                confirmedPolicyData.current = saved;
                rebuildEffectivePolicyData();
                snackbar.success({
                    message: t('tenants.permissions.card.groupInternal.recipientScope.saved'),
                    duration: 3,
                });
            });
            policyMutationQueue.current = save.then(
                () => undefined,
                () => undefined,
            );
            return save;
        },
        [rebuildEffectivePolicyData, t, tenantId, updateRecipientScope],
    );

    // Same queue again. Only `calendar` goes out: the group-chat scope and the switches stay as stored.
    const handleCalendarSave = useCallback(
        (change: CalendarPolicyChange) => {
            const operationGeneration = tenantGeneration.current;
            const save = policyMutationQueue.current.then(async () => {
                const confirmed = confirmedPolicyData.current;
                if (
                    !confirmed ||
                    String(confirmed.tenantId) !== tenantId ||
                    activeTenantId.current !== tenantId ||
                    tenantGeneration.current !== operationGeneration
                ) {
                    throw new Error('Permission policies of this Träger are not loaded');
                }
                const saved = await updateCalendar.mutateAsync({
                    tenantId: confirmed.tenantId,
                    policies: {},
                    ...toCalendarWrite(confirmed.calendar, change),
                });
                if (activeTenantId.current !== tenantId || tenantGeneration.current !== operationGeneration) return;
                confirmedPolicyData.current = saved;
                rebuildEffectivePolicyData();
                snackbar.success({ message: t('tenants.permissions.calendar.saved'), duration: 3 });
            });
            policyMutationQueue.current = save.then(
                () => undefined,
                () => undefined,
            );
            return save;
        },
        [rebuildEffectivePolicyData, t, tenantId, updateCalendar],
    );

    // Team-Chat: a plain Träger setting (no policy), saved like every other Träger setting.
    const changeTraegerSetting = useCallback(
        (field: TraegerOnlySetting, value: boolean) => {
            setPendingTraegerFields((current) => new Set([...current, field]));
            updateTenantSettings(
                { settings: { [field]: value } },
                {
                    onSettled: () =>
                        setPendingTraegerFields((current) => new Set([...current].filter((f) => f !== field))),
                },
            );
        },
        [updateTenantSettings],
    );
    const traegerSettings = useMemo<TraegerOnlySettings>(
        () => ({
            source: 'own',
            values: tenantData?.settings as TraegerOnlySettings['values'],
            pendingFields: pendingTraegerFields,
            onChange: changeTraegerSetting,
        }),
        [changeTraegerSetting, pendingTraegerFields, tenantData?.settings],
    );

    /**
     * ORISO-Admin#1577: the counselling app shows call buttons only while the Träger's
     * `extendedSettings.isVideoCallAllowed` is on, so it follows the tiles. It runs after the tile's own
     * save in the same queue, and only if that save went through.
     */
    const handleCallsAllowedChange = useCallback(
        (allowed: boolean, change: { field: string; value: boolean }) => {
            const operationGeneration = tenantGeneration.current;
            const run = async () => {
                if (activeTenantId.current !== tenantId || tenantGeneration.current !== operationGeneration) return;
                const saved = confirmedPolicyData.current?.policies?.[change.field];
                if (saved && saved.value !== change.value) return;
                if (tenantData?.settings?.extendedSettings?.isVideoCallAllowed === allowed) return;
                try {
                    await writeCallsAllowed({
                        settings: { extendedSettings: { isVideoCallAllowed: allowed } },
                    } as Partial<TenantAdminData>);
                } catch {
                    // The mutation hook reports the error; the tile value stays as saved.
                }
            };
            policyMutationQueue.current = policyMutationQueue.current.then(run, run);
        },
        [tenantData?.settings?.extendedSettings?.isVideoCallAllowed, tenantId, writeCallsAllowed],
    );

    if (policiesError) {
        return (
            <Notify retry quietText={t('notify.tile.notLoaded')} title={t('notify.title.permissions')} severity="error">
                {t('error.loading')}
            </Notify>
        );
    }

    return (
        <PermissionsSettingsView
            tenantId={tenantId}
            caseHandoverTenantId={Number(tenantId) || undefined}
            excludeCardKeys={excludeCardKeys}
            liveChatLinks={liveChatLinks}
            introScopeNote={introScopeNote}
            traegerSettings={traegerSettings}
            onCallsAllowedChange={handleCallsAllowedChange}
            isLoading={isLoading || policiesLoading}
            initialValues={initialValues}
            formStateKey={formStateKey}
            restrictedFields={restrictedFields}
            onToggleUpdate={handleToggleUpdate}
            policyLevel="tenant"
            permissionPolicies={effectivePolicyData?.policies}
            ownSettings={tenantData?.settings as Record<string, unknown> | undefined}
            pendingPolicyFields={pendingPolicyFields}
            onPolicyChange={handlePolicyChange}
            onPoliciesChange={handlePoliciesChange}
            recipientScope={{
                // Until the effect above has copied the loaded data over, read the query result: an
                // absent field means "backend too old", and must not flash while loading.
                policy: (effectivePolicyData ?? loadedPolicyData)?.internalGroupChat?.recipientScope,
                onSave: handleRecipientScopeSave,
            }}
            calendar={{
                policies: (effectivePolicyData ?? loadedPolicyData)?.calendar,
                onSave: handleCalendarSave,
            }}
        />
    );
};
