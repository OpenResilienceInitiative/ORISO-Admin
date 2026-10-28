import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import {
    ReasonPolicySaveFailure,
    reasonPolicySaveFailure,
    useCaseHandoverReasonPoliciesData,
    useCaseHandoverReasonPoliciesMutation,
} from '../../../../../hooks/useCaseHandoverReasonPolicies';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { canEditCaseHandoverReasonPolicies } from '../../../../../constants/caseHandoverAccess';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import type { CaseHandoverConsentPolicy, PolicyValue } from '../../../../../types/permissionPolicy';
import {
    applyClientConsentPolicy,
    applyMaxAccessDuration,
    applyNotificationTemplate,
    isHandoverModuleEnabled,
    NotificationLanguage,
} from './caseHandoverCardUtils';
import { CaseHandoverCardView } from './CaseHandoverCardView';

/**
 * Wires the canonical handover master and Träger-owned reason policies.
 * The platform master needs no selected Träger; individual reasons need a concrete Träger.
 * The agency page shows both as read-only instead of writing another scope's configuration.
 */
export type CaseHandoverCardProps = {
    /** The Träger whose rules are shown and saved; undefined on the platform-wide page. */
    tenantId?: number;
    /** The Träger is not known yet (its agency is loading): show loading, not "no Träger". */
    tenantPending?: boolean;
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    pendingPolicyFields?: ReadonlySet<string>;
    openPolicyMenu?: string | null;
    onOpenPolicyMenu?: (fieldKey: string | null) => void;
    onFeaturePolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

export const CaseHandoverCard = ({
    tenantId,
    tenantPending = false,
    policyLevel,
    permissionPolicies,
    pendingPolicyFields,
    openPolicyMenu,
    onOpenPolicyMenu,
    onFeaturePolicyChange,
}: CaseHandoverCardProps = {}) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const canEdit = policyLevel !== 'agency' && canEditCaseHandoverReasonPolicies(isSuperAdmin, can);

    const { data, isLoading, isError } = useCaseHandoverReasonPoliciesData(tenantId);
    const updateReasonPolicies = useCaseHandoverReasonPoliciesMutation(tenantId);

    // Local mirror so toggles respond immediately; server refetch re-syncs it.
    const [policies, setPolicies] = useState<CaseHandoverReasonPolicy[]>([]);
    useEffect(() => {
        if (Array.isArray(data)) {
            setPolicies(data);
        }
    }, [data]);

    // A failed save keeps the edit on screen and says so; no silent rollback (FE#1725).
    const [saveFailure, setSaveFailure] = useState<ReasonPolicySaveFailure | null>(null);

    const moduleEnabled = useMemo(
        () => permissionPolicies?.caseHandoverEnabled?.value ?? isHandoverModuleEnabled(policies),
        [permissionPolicies, policies],
    );

    const persist = useCallback(
        (nextPolicies: CaseHandoverReasonPolicy[]) => {
            if (!canEdit) return;
            setPolicies(nextPolicies);
            setSaveFailure(null);
            updateReasonPolicies.mutate(
                nextPolicies.map((policy) => ({
                    ...policy,
                    policyAuthority: policy.policyAuthority === '' ? null : policy.policyAuthority,
                })),
                {
                    onError: (error) => setSaveFailure(reasonPolicySaveFailure(error)),
                },
            );
        },
        [canEdit, updateReasonPolicies],
    );

    const handleRetrySave = useCallback(() => persist(policies), [persist, policies]);

    const handleClientConsentPolicyChange = useCallback(
        (code: string, clientConsent: CaseHandoverConsentPolicy) =>
            persist(applyClientConsentPolicy(policies, code, clientConsent)),
        [persist, policies],
    );

    const handleNotificationTemplateChange = useCallback(
        (code: string, language: NotificationLanguage, text: string) =>
            persist(applyNotificationTemplate(policies, code, language, text)),
        [persist, policies],
    );

    const handleMaxAccessDurationChange = useCallback(
        (code: string, minutes: number) => persist(applyMaxAccessDuration(policies, code, minutes)),
        [persist, policies],
    );

    if (isError) {
        return <Alert type="error" message={t('error.loading')} showIcon data-testid="case-handover-card-error" />;
    }

    return (
        <CaseHandoverCardView
            policies={policies}
            isLoading={tenantPending || isLoading}
            isSaving={updateReasonPolicies.isPending}
            canEdit={canEdit}
            noTenant={!tenantPending && !(typeof tenantId === 'number' && tenantId > 0)}
            saveError={saveFailure ? t(`tenants.permissions.card.caseHandover.saveFailed.${saveFailure}`) : null}
            onRetrySave={handleRetrySave}
            moduleEnabled={moduleEnabled}
            onClientConsentPolicyChange={handleClientConsentPolicyChange}
            onNotificationTemplateChange={handleNotificationTemplateChange}
            onMaxAccessDurationChange={handleMaxAccessDurationChange}
            policyLevel={policyLevel}
            permissionPolicies={permissionPolicies}
            pendingPolicyFields={pendingPolicyFields}
            openPolicyMenu={openPolicyMenu}
            onOpenPolicyMenu={onOpenPolicyMenu}
            onFeaturePolicyChange={onFeaturePolicyChange}
        />
    );
};
