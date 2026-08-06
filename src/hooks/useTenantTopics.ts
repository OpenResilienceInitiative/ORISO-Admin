import { useQuery } from '@tanstack/react-query';
import getTopicByTenantData from '../api/topic/getTopicByTenantData';
import { TopicData } from '../types/topic';

export const useTenantTopics = (onlyActive?: boolean) => {
    return useQuery<TopicData[]>({
        queryKey: ['ALL_TOPICS', onlyActive],
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
