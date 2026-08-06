import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { topicEndpoint } from '../appConfig';
import { TopicData } from '../types/topic';

interface UseTopicDataOptions extends Omit<UseQueryOptions<TopicData>, 'queryKey' | 'queryFn'> {
    id: string;
}

export const useTopicData = ({ id, ...options }: UseTopicDataOptions) => {
    return useQuery<TopicData>({
        queryKey: ['TOPICS', id],
        queryFn: () =>
            fetchData({
                url: `${topicEndpoint}/${id}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
        ...options,
    });
};
