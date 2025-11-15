import { useQuery, UseQueryOptions } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { topicEndpoint } from '../appConfig';
import { TopicData } from '../types/topic';

interface UseTopicDataOptions extends UseQueryOptions<TopicData> {
    id: string;
}

export const useTopicData = ({ id, ...options }: UseTopicDataOptions) => {
    return useQuery<TopicData>(
        ['TOPICS', id],
        () =>
            fetchData({
                url: `${topicEndpoint}/${id}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
        options,
    );
};
