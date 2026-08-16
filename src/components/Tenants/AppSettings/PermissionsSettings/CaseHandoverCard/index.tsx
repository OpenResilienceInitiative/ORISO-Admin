import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import {
    useCaseHandoverReasonPoliciesData,
    useCaseHandoverReasonPoliciesMutation,
} from '../../../../../hooks/useCaseHandoverReasonPolicies';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { canEditCaseHandoverReasonPolicies } from '../../../../../constants/caseHandoverAccess';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import type { PolicyValue } from '../../../../../types/permissionPolicy';
import {
    applyClientConsent,
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
    policyLevel?: 'platform' | 'tenant' | 'agency';
    permissionPolicies?: Record<string, PolicyValue<boolean>>;
    pendingPolicyField?: string | null;
    pendingPolicyFields?: ReadonlySet<string>;
    openPolicyMenu?: string | null;
    onOpenPolicyMenu?: (fieldKey: string | null) => void;
    onFeaturePolicyChange?: (fieldKey: string, policy: PolicyValue<boolean>) => void;
};

export const CaseHandoverCard = ({
    policyLevel,
    permissionPolicies,
    pendingPolicyField,
    pendingPolicyFields,
    openPolicyMenu,
    onOpenPolicyMenu,
    onFeaturePolicyChange,
}: CaseHandoverCardProps = {}) => {
    const { t } = useTranslation();
    const { can } = useUserPermissions();
    const { isSuperAdmin } = useUserRoles();
    const canEdit = canEditCaseHandoverReasonPolicies(isSuperAdmin, can);

    const { data, isLoading, isError } = useCaseHandoverReasonPoliciesData();
    const updateReasonPolicies = useCaseHandoverReasonPoliciesMutation();

    // Local mirror so toggles respond immediately; server refetch re-syncs it.
    const [policies, setPolicies] = useState<CaseHandoverReasonPolicy[]>([]);
    useEffect(() => {
        if (Array.isArray(data)) {
            setPolicies(data);
        }
    }, [data]);

    // Snapshot to roll back to if the mutation fails, so a false success never sticks.
    const previousPoliciesRef = useRef<CaseHandoverReasonPolicy[]>(policies);

    const moduleEnabled = useMemo(() => isHandoverModuleEnabled(policies), [policies]);

    const persist = useCallback(
        (nextPolicies: CaseHandoverReasonPolicy[]) => {
            previousPoliciesRef.current = policies;
            setPolicies(nextPolicies);
            updateReasonPolicies.mutate(
                nextPolicies.map((policy) => ({
                    ...policy,
                    policyAuthority: policy.policyAuthority === '' ? null : policy.policyAuthority,
                })),
                {
                    onError: () => setPolicies(previousPoliciesRef.current),
                },
            );
        },
        [policies, updateReasonPolicies],
    );

    const handleModuleEnabledChange = useCallback(
        (enabled: boolean) => persist(applyModuleEnabled(policies, enabled)),
        [persist, policies],
    );

    const handleClientConsentChange = useCallback(
        (code: string, clientConsentRequired: boolean) =>
            persist(applyClientConsent(policies, code, clientConsentRequired)),
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
            canEdit={canEdit}
            moduleEnabled={moduleEnabled}
            onModuleEnabledChange={handleModuleEnabledChange}
            onClientConsentChange={handleClientConsentChange}
            onNotificationTemplateChange={handleNotificationTemplateChange}
            onMaxAccessDurationChange={handleMaxAccessDurationChange}
            policyLevel={policyLevel}
            permissionPolicies={permissionPolicies}
            pendingPolicyField={pendingPolicyField}
            pendingPolicyFields={pendingPolicyFields}
            openPolicyMenu={openPolicyMenu}
            onOpenPolicyMenu={onOpenPolicyMenu}
            onFeaturePolicyChange={onFeaturePolicyChange}
        />
    );
};
