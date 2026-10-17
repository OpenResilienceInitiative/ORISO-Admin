import { message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { caseHandoverReasonPoliciesEndpoint } from '../appConfig';
import { CaseHandoverReasonPolicy } from '../types/caseHandoverReasonPolicy';

const CASE_HANDOVER_REASON_POLICIES_QUERY_KEY = 'CASE_HANDOVER_REASON_POLICIES';

const isTenantId = (tenantId?: number): tenantId is number => typeof tenantId === 'number' && tenantId > 0;

// The rules belong to one Träger; the UserService needs it named for platform admins (FE#1725).
// Without one nothing is requested: the call rejects before it reaches the network.
const policiesUrl = (tenantId?: number) =>
    isTenantId(tenantId)
        ? Promise.resolve(`${caseHandoverReasonPoliciesEndpoint}?tenantId=${tenantId}`)
        : Promise.reject(new Error('No Träger named for the case handover rules'));

// 403 stays in the card (no access-denied redirect); other failures reject with the raw Response.
const RESPONSE_HANDLING = [FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT];

/** Why a save failed, as far as the card needs to tell the admin. */
export type ReasonPolicySaveFailure = 'forbidden' | 'invalid' | 'other';

export const reasonPolicySaveFailure = (error: unknown): ReasonPolicySaveFailure => {
    if (error instanceof Error && error.message === FETCH_ERRORS.NOT_ALLOWED) return 'forbidden';
    if (error instanceof Response && error.status === 403) return 'forbidden';
    if (error instanceof Response && error.status === 400) return 'invalid';
    return 'other';
};

/** `tenantId` = the Träger whose rules are shown; without it nothing is requested. */
export const useCaseHandoverReasonPoliciesData = (tenantId?: number) => {
    return useQuery({
        queryKey: [CASE_HANDOVER_REASON_POLICIES_QUERY_KEY, tenantId],
        queryFn: () =>
            policiesUrl(tenantId).then((url) =>
                fetchData({
                    url,
                    method: FETCH_METHODS.GET,
                    skipAuth: false,
                    responseHandling: RESPONSE_HANDLING,
                }),
            ),
        enabled: isTenantId(tenantId),
        retry: false,
        refetchOnWindowFocus: false,
    });
};

export const useCaseHandoverReasonPoliciesMutation = (tenantId?: number) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (policies: CaseHandoverReasonPolicy[]) =>
            policiesUrl(tenantId).then((url) =>
                fetchData({
                    url,
                    method: FETCH_METHODS.PUT,
                    skipAuth: false,
                    bodyData: JSON.stringify(policies),
                    responseHandling: [FETCH_SUCCESS.CONTENT, ...RESPONSE_HANDLING],
                }),
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CASE_HANDOVER_REASON_POLICIES_QUERY_KEY, tenantId] });
            message.success({
                content: t('caseHandoverLogs.policy.saveSuccess'),
                duration: 3,
            });
        },
        // Failures are shown inside the card, next to the unsaved edit.
    });
};
