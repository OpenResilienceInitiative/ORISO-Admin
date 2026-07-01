import { useQuery, QueryOptions } from '@tanstack/react-query';
import getTopicData from '../api/topic/getTopicData';
import { ResponseList } from '../types/ResponseList';
import { TopicData } from '../types/topic';

interface UseTopicDataOptions extends QueryOptions<ResponseList<TopicData>> {
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
    search?: string;
}

export const useTopicList = ({ current, sortBy, order, pageSize, search, ...options }: UseTopicDataOptions) => {
    return useQuery({
        queryKey: ['TOPICS', current, sortBy, order, pageSize, search],
        queryFn: () => getTopicData({ current, sortBy, order, pageSize, search }),
        ...options,
    });
};
