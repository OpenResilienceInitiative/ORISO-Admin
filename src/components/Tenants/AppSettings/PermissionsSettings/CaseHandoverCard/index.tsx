import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    useCaseHandoverReasonPoliciesData,
    useCaseHandoverReasonPoliciesMutation,
} from '../../../../../hooks/useCaseHandoverReasonPolicies';
import { useUserPermissions } from '../../../../../hooks/useUserPermission';
import { useUserRoles } from '../../../../../hooks/useUserRoles.hook';
import { canEditCaseHandoverReasonPolicies } from '../../../../../constants/caseHandoverAccess';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import { applyClientConsent, applyModuleEnabled, isHandoverModuleEnabled } from './caseHandoverCardUtils';
import { CaseHandoverCardView } from './CaseHandoverCardView';

/** Container: wires the platform case-handover reason policies (UserService)
 *  into the permissions card. Policies are platform-scoped — tenant-level
 *  overrides are a backend follow-up, so non-privileged admins see the card
 *  read-only (disable, don't hide). */
export const CaseHandoverCard = () => {
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

    const moduleEnabled = useMemo(() => isHandoverModuleEnabled(policies), [policies]);

    const persist = useCallback(
        (nextPolicies: CaseHandoverReasonPolicy[]) => {
            setPolicies(nextPolicies);
            updateReasonPolicies.mutate(
                nextPolicies.map((policy) => ({
                    ...policy,
                    policyAuthority: policy.policyAuthority === '' ? null : policy.policyAuthority,
                })),
            );
        },
        [updateReasonPolicies],
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

    if (isError) {
        return null;
    }

    return (
        <CaseHandoverCardView
            policies={policies}
            isLoading={isLoading}
            canEdit={canEdit}
            moduleEnabled={moduleEnabled}
            onModuleEnabledChange={handleModuleEnabledChange}
            onClientConsentChange={handleClientConsentChange}
        />
    );
};
