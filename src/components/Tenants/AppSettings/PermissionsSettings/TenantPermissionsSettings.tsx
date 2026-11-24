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
import { useJourneysInTiles } from '../../../Journeys/JourneysInTiles';
import { toRecipientScopeWrite } from './RecipientScope/recipientScopePolicy';
import { type CalendarPolicyChange, toCalendarWrite } from './Calendar/calendarPolicy';
import {
    type CaseSharingMode,
    caseSharingPolicyFromApi,
    caseSharingPolicyToApi,
} from './CaseSharingSection/caseSharingMode';
import { usePendingCaseSharing } from './CaseSharingSection/usePendingCaseSharing';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';
import type { PolicyValue, RecipientScopePolicy, TenantPermissionPolicies } from '../../../../types/permissionPolicy';
import { Notify } from '../../../Notify';
import type { CallsPermission } from './derivedLegacySettings';
import type { TenantAdminData } from '../../../../types/TenantAdminData';
import { useAppConfigContext } from '../../../../context/useAppConfig';
import { useUserRoles } from '../../../../hooks/useUserRoles.hook';

export const TenantPermissionsSettings = ({
    tenantId,
    excludeCardKeys,
    liveChatLinks,
    introScopeNote,
}: PermissionsSettingsCommonArgs) => {
    const { t } = useTranslation();
    // The Träger's journeys: the platform's with its own layer for An Bord and Ankunft (ADR-036 decision 29).
    const journeys = useJourneysInTiles({ level: 'tenant', tenantId });
    const { settings: appSettings } = useAppConfigContext();
    const { isSuperAdmin } = useUserRoles();
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
    // Whether the latest queued save of a field went through; what follows a tile waits for it.
    const policySaveOutcomes = useRef(new Map<string, Promise<boolean>>());
    const activeTenantId = useRef(tenantId);
    const tenantGeneration = useRef(0);
    const { mutate: updateTenantSettings } = useTenantAdminDataMutation({
        id: tenantId,
        successMessageKey: 'tenants.message.settingsUpdate',
    });
    // ORISO-Admin#1577: follows the tiles in the background; the tile change already said "saved".
    const { mutateAsync: writeCallsAllowed } = useTenantAdminDataMutation({ id: tenantId, successMessageKey: null });
    const [callsPermissionPending, setCallsPermissionPending] = useState(false);
    // The stored call permission as of now, not as of the render that queued a write (#1578 review).
    const storedCallsAllowed = tenantData?.settings?.extendedSettings?.isVideoCallAllowed;
    const currentCallsAllowed = useRef(storedCallsAllowed);
    useEffect(() => {
        currentCallsAllowed.current = storedCallsAllowed;
    }, [storedCallsAllowed]);

    useEffect(() => {
        tenantGeneration.current += 1;
        activeTenantId.current = tenantId;
        pendingPolicyOperations.current = [];
        policyMutationQueue.current = Promise.resolve();
        policySaveOutcomes.current = new Map();
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
            // No stale outcome may stand in for a change that is never queued.
            Object.keys(changes).forEach((field) => policySaveOutcomes.current.delete(field));
            if (!confirmedPolicyData.current) return;
            if (String(confirmedPolicyData.current.tenantId) !== tenantId) return;
            const operation = { id: nextPolicyOperationId.current, tenantId, changes };
            const operationGeneration = tenantGeneration.current;
            nextPolicyOperationId.current += 1;
            pendingPolicyOperations.current.push(operation);
            rebuildEffectivePolicyData();
            const run = async (): Promise<boolean> => {
                if (activeTenantId.current !== operation.tenantId || tenantGeneration.current !== operationGeneration)
                    return false;
                const confirmed = confirmedPolicyData.current;
                if (!confirmed || String(confirmed.tenantId) !== operation.tenantId) return false;
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
                    return true;
                } catch {
                    // The mutation hook reports the error. Only confirmed server data is retained here.
                    return false;
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
            const outcome = policyMutationQueue.current.then(run, run);
            Object.keys(changes).forEach((field) => policySaveOutcomes.current.set(field, outcome));
            policyMutationQueue.current = outcome.then(() => undefined);
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

    // Same queue again (ORISO-TenantService#374). Only `caseSharing` goes out; the backend derives
    // caseHandoverEnabled from it, so the switches are read back from the saved answer.
    const { pending: pendingCaseSharing, track: trackCaseSharing } = usePendingCaseSharing(tenantId);
    const handleCaseSharingSave = useCallback(
        (next: PolicyValue<CaseSharingMode>) => {
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
                    caseSharing: { mode: caseSharingPolicyToApi(next) },
                });
                if (activeTenantId.current !== tenantId || tenantGeneration.current !== operationGeneration) return;
                confirmedPolicyData.current = saved;
                rebuildEffectivePolicyData();
                snackbar.success({ message: t('tenants.permissions.caseSharing.saved'), duration: 3 });
            });
            policyMutationQueue.current = save.then(
                () => undefined,
                () => undefined,
            );
            trackCaseSharing(next, save);
            save.catch(() => snackbar.error({ message: t('tenants.permissions.policy.saveError') }));
        },
        [rebuildEffectivePolicyData, t, tenantId, trackCaseSharing, updateCalendar],
    );
    const caseSharingPolicy = (effectivePolicyData ?? loadedPolicyData)?.caseSharing?.mode;

    /**
     * Runs `write` after every queued policy save: a tenant PUT carries the whole tenant, so it must
     * not overtake, or be overtaken by, a policy write (#1578 review). Skipped after a tenant switch.
     */
    const enqueueTenantWrite = useCallback(
        (write: () => Promise<void>) => {
            const operationGeneration = tenantGeneration.current;
            const run = async () => {
                if (activeTenantId.current !== tenantId || tenantGeneration.current !== operationGeneration) return;
                try {
                    await write();
                } catch {
                    // The mutation hook reports the error.
                }
            };
            policyMutationQueue.current = policyMutationQueue.current.then(run, run);
        },
        [tenantId],
    );

    /**
     * ORISO-Admin#1577: the counselling app shows call buttons only while the Träger's
     * `extendedSettings.isVideoCallAllowed` is on, so it follows the tiles: in the same queue, after
     * the tile's own save and only if that save went through, compared with the value stored by then.
     */
    const followCallsAllowed = useCallback(
        (allowed: boolean, afterField?: string) => {
            const saved = afterField
                ? policySaveOutcomes.current.get(afterField) ?? Promise.resolve(false)
                : Promise.resolve(true);
            enqueueTenantWrite(async () => {
                if (!(await saved) || currentCallsAllowed.current === allowed) return;
                setCallsPermissionPending(true);
                try {
                    await writeCallsAllowed({
                        settings: { extendedSettings: { isVideoCallAllowed: allowed } },
                    } as Partial<TenantAdminData>);
                    currentCallsAllowed.current = allowed;
                } finally {
                    setCallsPermissionPending(false);
                }
            });
        },
        [enqueueTenantWrite, writeCallsAllowed],
    );
    // Only where the former "Anrufe" switch was offered: not to a Träger admin on the single domain.
    const callsPermissionWritable = isSuperAdmin || !appSettings.multitenancyWithSingleDomainEnabled;
    const callsPermission = useMemo<CallsPermission | undefined>(
        () =>
            callsPermissionWritable
                ? { stored: storedCallsAllowed, pending: callsPermissionPending, follow: followCallsAllowed }
                : undefined,
        [callsPermissionPending, callsPermissionWritable, followCallsAllowed, storedCallsAllowed],
    );

    if (policiesError) {
        return (
            <Notify retry quietText={t('notify.tile.notLoaded')} title={t('notify.title.permissions')} severity="error">
                {t('error.loading')}
            </Notify>
        );
    }

    return (
        <>
            <PermissionsSettingsView
                tenantId={tenantId}
                caseHandoverTenantId={Number(tenantId) || undefined}
                excludeCardKeys={excludeCardKeys}
                liveChatLinks={liveChatLinks}
                introScopeNote={introScopeNote}
                callsPermission={callsPermission}
                renderJourneys={journeys.renderJourneys}
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
                caseSharing={
                    caseSharingPolicy
                        ? {
                              policy: pendingCaseSharing ?? caseSharingPolicyFromApi(caseSharingPolicy),
                              onChange: handleCaseSharingSave,
                          }
                        : undefined
                }
            />
            {journeys.dialog}
        </>
    );
};
