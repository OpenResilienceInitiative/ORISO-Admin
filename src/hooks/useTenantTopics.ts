import { useQuery } from '@tanstack/react-query';
import getTopicByTenantData from '../api/topic/getTopicByTenantData';
import { TopicData } from '../types/topic';

interface UseTenantTopicsOptions {
    /**
     * By default a failing topic service yields an empty list, because most pages work without topics. A
     * caller that must not decide on missing data (the agency activation gate) sets this to receive the error
     * instead. The mode is part of the query key, so the two kinds of callers never share a cached result.
     */
    failClosed?: boolean;
}

export const useTenantTopics = (
    onlyActive?: boolean,
    enabled = true,
    { failClosed = false }: UseTenantTopicsOptions = {},
) => {
    return useQuery<TopicData[]>({
        enabled,
        queryKey: failClosed ? ['ALL_TOPICS', onlyActive, 'fail-closed'] : ['ALL_TOPICS', onlyActive],
        queryFn: () =>
            getTopicByTenantData()
                .then((topics) => {
                    return onlyActive ? topics.filter(({ status }) => status === 'ACTIVE') : topics;
                })
                .catch((error) => {
                    if (failClosed) throw error;
                    // Return empty array if topics service is not available
                    return [];
                }),
    });
};
