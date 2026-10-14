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
    applyModuleEnabled,
    applyNotificationTemplate,
    isHandoverModuleEnabled,
    NotificationLanguage,
} from './caseHandoverCardUtils';
import { CaseHandoverCardView } from './CaseHandoverCardView';

/** Container: wires the platform case-handover reason policies (UserService)
 *  into the permissions card. Policies are platform-scoped — tenant-level
 *  overrides are a backend follow-up, so non-privileged admins see the card
 *  read-only (disable, don't hide). */
export type CaseHandoverCardProps = {
    /** The Träger whose rules are shown and saved; undefined on the platform-wide page. */
    tenantId?: number;
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    pendingPolicyFields?: ReadonlySet<string>;
    openPolicyMenu?: string | null;
    onOpenPolicyMenu?: (fieldKey: string | null) => void;
    onFeaturePolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

export const CaseHandoverCard = ({
    tenantId,
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
    const canEdit = canEditCaseHandoverReasonPolicies(isSuperAdmin, can);

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

    const moduleEnabled = useMemo(() => isHandoverModuleEnabled(policies), [policies]);

    const persist = useCallback(
        (nextPolicies: CaseHandoverReasonPolicy[]) => {
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
        [updateReasonPolicies],
    );

    const handleRetrySave = useCallback(() => persist(policies), [persist, policies]);

    const handleModuleEnabledChange = useCallback(
        (enabled: boolean) => persist(applyModuleEnabled(policies, enabled)),
        [persist, policies],
    );

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
            isLoading={isLoading}
            isSaving={updateReasonPolicies.isPending}
            canEdit={canEdit}
            noTenant={!(typeof tenantId === 'number' && tenantId > 0)}
            saveError={saveFailure ? t(`tenants.permissions.card.caseHandover.saveFailed.${saveFailure}`) : null}
            onRetrySave={handleRetrySave}
            moduleEnabled={moduleEnabled}
            onModuleEnabledChange={handleModuleEnabledChange}
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
