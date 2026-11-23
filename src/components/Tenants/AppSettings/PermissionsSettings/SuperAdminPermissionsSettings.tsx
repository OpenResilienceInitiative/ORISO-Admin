import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { snackbar } from '../../../Snackbar';
import { useTenantAdminControls } from '../../../../hooks/useTenantAdminControls.hook';
import {
    useCalendarControlsMutation,
    useRecipientScopeControlsMutation,
    useTenantAdminControlsMutation,
} from '../../../../hooks/useTenantAdminControlsMutation.hook';
import { buildTogglePayload } from './permissionsToggleLogic';
import {
    applyVisibleTogglesAsValues,
    buildTenantAdminControlsPayload,
    platformPresetValues,
} from './permissionsSettingsUtils';
import { PermissionsSettingsView } from './PermissionsSettingsView';
import { useJourneysInTiles } from '../../../Journeys/JourneysInTiles';
import {
    toRecipientScopeWrite,
    withStoredScopeOnly,
    withoutInternalGroupChat,
} from './RecipientScope/recipientScopePolicy';
import { type CalendarPolicyChange, toCalendarWrite, withoutCalendar } from './Calendar/calendarPolicy';
import type { PermissionsSettingsCommonArgs, ToggleAfterChangeHandler } from './types';
import type { PolicyValue, RecipientScopePolicy } from '../../../../types/permissionPolicy';
import type { TenantAdminControls } from '../../../../types/TenantAdminControls';

export const SuperAdminPermissionsSettings = ({
    tenantId,
    excludeCardKeys,
    liveChatLinks,
}: PermissionsSettingsCommonArgs) => {
    const { t } = useTranslation();
    const journeys = useJourneysInTiles({ level: 'platform' });
    const { data: platformControls, isLoading } = useTenantAdminControls(true);
    const [pendingPolicyFields, setPendingPolicyFields] = useState<ReadonlySet<string>>(new Set());
    const [effectivePlatformControls, setEffectivePlatformControls] = useState<TenantAdminControls | undefined>(
        platformControls,
    );
    const confirmedPlatformControls = useRef<TenantAdminControls | undefined>(platformControls);
    const pendingPolicyOperations = useRef<{ id: number; changes: Record<string, PolicyValue<boolean>> }[]>([]);
    const nextPolicyOperationId = useRef(0);
    const policyMutationQueue = useRef<Promise<void>>(Promise.resolve());
    const updateTenantAdminControls = useTenantAdminControlsMutation({
        successMessageKey: false,
        onError: () => snackbar.error({ message: t('tenants.permissions.policy.saveError') }),
    });
    // The scope control reports its own failure beside the edit, so no second, generic notification.
    const updateRecipientScope = useRecipientScopeControlsMutation();
    const updateCalendar = useCalendarControlsMutation();

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
            (current, operation) => ({ ...current, ...operation.changes }),
            { ...confirmed.permissionPolicies },
        );
        setEffectivePlatformControls({ ...confirmed, permissionPolicies });
        setPendingPolicyFields(new Set(pendingPolicyOperations.current.flatMap(({ changes }) => Object.keys(changes))));
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

    // Several fields in one operation are one request: they are saved, or rolled back, together (#1560).
    const handlePoliciesChange = useCallback(
        (changes: Record<string, PolicyValue<boolean>>) => {
            if (!confirmedPlatformControls.current) return;
            const operation = { id: nextPolicyOperationId.current, changes };
            nextPolicyOperationId.current += 1;
            pendingPolicyOperations.current.push(operation);
            rebuildEffectivePlatformControls();
            const run = async () => {
                const confirmed = confirmedPlatformControls.current;
                if (!confirmed) return;
                // The backend keeps the stored calendar preset when the block is left out.
                const next = withoutCalendar(
                    withStoredScopeOnly({
                        ...confirmed,
                        permissionPolicies: { ...confirmed.permissionPolicies, ...changes },
                    }),
                );
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
    const handlePolicyChange = useCallback(
        (fieldKey: string, policy: PolicyValue<boolean>) => handlePoliciesChange({ [fieldKey]: policy }),
        [handlePoliciesChange],
    );

    // Same queue as the switches, so a scope save and a switch save never overtake each other.
    const handleRecipientScopeSave = useCallback(
        (next: Pick<RecipientScopePolicy, 'value' | 'mode'>) => {
            const save = policyMutationQueue.current.then(async () => {
                const confirmed = confirmedPlatformControls.current;
                if (!confirmed) throw new Error('Platform controls are not loaded');
                confirmedPlatformControls.current = await updateRecipientScope.mutateAsync(
                    withoutCalendar({
                        ...confirmed,
                        ...toRecipientScopeWrite({ ...next, inherited: false }),
                    }),
                );
                rebuildEffectivePlatformControls();
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
        [rebuildEffectivePlatformControls, t, updateRecipientScope],
    );

    // Same queue again. Only the calendar preset changes: the group-chat scope is left out, and the
    // backend keeps it as stored (TenantService#321).
    const handleCalendarSave = useCallback(
        (change: CalendarPolicyChange) => {
            const save = policyMutationQueue.current.then(async () => {
                const confirmed = confirmedPlatformControls.current;
                if (!confirmed) throw new Error('Platform controls are not loaded');
                confirmedPlatformControls.current = await updateCalendar.mutateAsync(
                    withoutInternalGroupChat({
                        ...confirmed,
                        ...toCalendarWrite(confirmed.calendar, change),
                    }),
                );
                rebuildEffectivePlatformControls();
                snackbar.success({ message: t('tenants.permissions.calendar.saved'), duration: 3 });
            });
            policyMutationQueue.current = save.then(
                () => undefined,
                () => undefined,
            );
            return save;
        },
        [rebuildEffectivePlatformControls, t, updateCalendar],
    );

    // The form starts from the platform preset (initial preset ← allowed toggles ← stored platform
    // policies), never from a hard-coded all-on default that would contradict a stored policy.
    const initialValues = useMemo(
        () => ({
            settings: platformPresetValues(platformControls),
        }),
        [platformControls],
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

    // No `callsPermission`: this level cannot write a Träger's `isVideoCallAllowed`, so a stored "off"
    // that contradicts the tiles goes unsaid here until ORISO-TenantService#380 retires the value.
    return (
        <>
            <PermissionsSettingsView
                tenantId={tenantId}
                excludeCardKeys={excludeCardKeys}
                liveChatLinks={liveChatLinks}
                renderJourneys={journeys.renderJourneys}
                isLoading={isLoading}
                initialValues={initialValues}
                formStateKey="platform"
                restrictedFields={restrictedFields}
                onToggleUpdate={handleToggleUpdate}
                policyLevel="platform"
                permissionPolicies={effectivePlatformControls?.permissionPolicies}
                pendingPolicyFields={pendingPolicyFields}
                onPolicyChange={handlePolicyChange}
                onPoliciesChange={handlePoliciesChange}
                recipientScope={{
                    policy: (effectivePlatformControls ?? platformControls)?.internalGroupChat?.recipientScope,
                    onSave: handleRecipientScopeSave,
                }}
                calendar={{
                    policies: (effectivePlatformControls ?? platformControls)?.calendar,
                    onSave: handleCalendarSave,
                }}
            />
            {journeys.dialog}
        </>
    );
};
