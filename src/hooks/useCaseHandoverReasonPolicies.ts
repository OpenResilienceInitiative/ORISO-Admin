import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { QueryOptions, useMutation, useQuery, useQueryClient } from 'react-query';
import { fetchData, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { caseHandoverReasonPoliciesEndpoint } from '../appConfig';
import { CaseHandoverReasonPolicy } from '../types/caseHandoverReasonPolicy';

const CASE_HANDOVER_REASON_POLICIES_QUERY_KEY = 'CASE_HANDOVER_REASON_POLICIES';

export const useCaseHandoverReasonPoliciesData = () => {
    return useQuery(
        CASE_HANDOVER_REASON_POLICIES_QUERY_KEY,
        () =>
            fetchData({
                url: caseHandoverReasonPoliciesEndpoint,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            }),
        {
            retry: false,
            refetchOnWindowFocus: false,
        } as QueryOptions<CaseHandoverReasonPolicy[]>,
    );
};

export const useCaseHandoverReasonPoliciesMutation = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation(
        (policies: CaseHandoverReasonPolicy[]) =>
            fetchData({
                url: caseHandoverReasonPoliciesEndpoint,
                method: FETCH_METHODS.PUT,
                skipAuth: false,
                bodyData: JSON.stringify(policies),
                responseHandling: [FETCH_SUCCESS.CONTENT],
            }),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(CASE_HANDOVER_REASON_POLICIES_QUERY_KEY);
                message.success({
                    content: t('caseHandoverLogs.policy.saveSuccess'),
                    duration: 3,
                });
            },
            onError: () => {
                message.error({
                    content: t('caseHandoverLogs.policy.saveError'),
                    duration: 5,
                });
            },
        },
    );
};
