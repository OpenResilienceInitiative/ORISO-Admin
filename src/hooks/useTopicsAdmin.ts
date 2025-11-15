import { useQuery } from 'react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { topicAdminEndpoint } from '../appConfig';
import { TopicData } from '../types/topic';

export const useTopicsAdmin = (onlyActive?: boolean) => {
    return useQuery<TopicData[]>(['TOPIC_ADMINS', onlyActive], () =>
        fetchData({
            url: `${topicAdminEndpoint}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
        }),
    );
};
