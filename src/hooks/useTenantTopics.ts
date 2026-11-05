import { useQuery } from '@tanstack/react-query';
import getTopicByTenantData from '../api/topic/getTopicByTenantData';
import { TopicData } from '../types/topic';
import { useLanguage } from './useLanguage';

export const useTenantTopics = (onlyActive?: boolean) => {
    // Topic names are resolved server-side from Accept-Language (#564) — the
    // current UI language must be part of the key or a language switch keeps
    // serving the names cached in the previous language.
    const { language } = useLanguage();

    return useQuery<TopicData[]>({
        queryKey: ['ALL_TOPICS', onlyActive, language],
        queryFn: () =>
            getTopicByTenantData()
                .then((topics) => {
                    return onlyActive ? topics.filter(({ status }) => status === 'ACTIVE') : topics;
                })
                .catch(() => {
                    // console.error('Failed to fetch topics:', error);
                    // Return empty array if topics service is not available
                    return [];
                }),
    });
};
