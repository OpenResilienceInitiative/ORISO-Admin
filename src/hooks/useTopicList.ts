import { useQuery, QueryOptions } from 'react-query';
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
    return useQuery(
        ['TOPICS', current, sortBy, order, pageSize, search],
        () => getTopicData({ current, sortBy, order, pageSize, search }),
        options,
    );
};
