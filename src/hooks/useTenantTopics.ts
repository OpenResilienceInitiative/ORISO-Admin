import { useQuery } from '@tanstack/react-query';
import getTopicByTenantData from '../api/topic/getTopicByTenantData';
import { TopicData } from '../types/topic';
import { useLanguage } from './useLanguage';

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
    // Topic names are resolved server-side from Accept-Language (#564) — the
    // current UI language must be part of the key or a language switch keeps
    // serving the names cached in the previous language.
    const { language } = useLanguage();

    return useQuery<TopicData[]>({
        enabled,
        queryKey: failClosed
            ? ['ALL_TOPICS', onlyActive, language, 'fail-closed']
            : ['ALL_TOPICS', onlyActive, language],
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
