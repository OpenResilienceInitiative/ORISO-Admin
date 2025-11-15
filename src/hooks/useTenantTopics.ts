import { useQuery } from 'react-query';
import getTopicByTenantData from '../api/topic/getTopicByTenantData';
import { TopicData } from '../types/topic';

export const useTenantTopics = (onlyActive?: boolean) => {
    return useQuery<TopicData[]>(['ALL_TOPICS', onlyActive], () =>
        getTopicByTenantData()
            .then((topics) => {
                return onlyActive ? topics.filter(({ status }) => status === 'ACTIVE') : topics;
            })
            .catch((error) => {
                console.error('Failed to fetch topics:', error);
                // Return empty array if topics service is not available
                return [];
            }),
    );
};
