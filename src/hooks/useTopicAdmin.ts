import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { topicAdminEndpoint } from '../appConfig';
import { TopicAdminData } from '../types/TopicAdmin';

interface TopicAdminOptions extends Omit<UseQueryOptions<TopicAdminData>, 'queryKey' | 'queryFn'> {
    id: string | number;
}

export const TOPIC_ADMIN_KEY = 'TOPIC_ADMIN';

export const useTopicAdmin = ({ id, ...options }: TopicAdminOptions) => {
    return useQuery<TopicAdminData>({
        queryKey: [TOPIC_ADMIN_KEY, id],
        queryFn: () =>
            fetchData({
                url: `${topicAdminEndpoint}/${id}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
        ...options,
    });
};
