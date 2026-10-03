import { useQuery } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { topicAdminEndpoint } from '../appConfig';
import { TopicData } from '../types/topic';
import { useLanguage } from './useLanguage';

export const useTopicsAdmin = (onlyActive?: boolean) => {
    // This list returns TopicData (flat, server-resolved `name`), unlike the
    // per-id useTopicAdmin which returns the raw per-language map for editing.
    // The name is resolved from Accept-Language (#564), so the current UI
    // language must be part of the key or a language switch keeps serving
    // the names cached in the previous language.
    const { language } = useLanguage();

    return useQuery<TopicData[]>({
        queryKey: ['TOPIC_ADMINS', onlyActive, language],
        queryFn: () =>
            fetchData({
                url: `${topicAdminEndpoint}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            }),
    });
};
