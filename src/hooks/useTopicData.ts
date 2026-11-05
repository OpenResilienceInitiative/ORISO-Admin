import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { topicEndpoint } from '../appConfig';
import { TopicData } from '../types/topic';
import { useLanguage } from './useLanguage';

interface UseTopicDataOptions extends Omit<UseQueryOptions<TopicData>, 'queryKey' | 'queryFn'> {
    id: string;
}

export const useTopicData = ({ id, ...options }: UseTopicDataOptions) => {
    // Topic names are resolved server-side from Accept-Language (#564) — the
    // current UI language must be part of the key or a language switch keeps
    // serving the name cached in the previous language.
    const { language } = useLanguage();

    return useQuery<TopicData>({
        queryKey: ['TOPICS', id, language],
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
