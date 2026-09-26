import { useQuery, QueryOptions } from '@tanstack/react-query';
import getTopicData from '../api/topic/getTopicData';
import { ResponseList } from '../types/ResponseList';
import { TopicData } from '../types/topic';
import { useLanguage } from './useLanguage';

interface UseTopicDataOptions extends QueryOptions<ResponseList<TopicData>> {
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
    search?: string;
}

export const useTopicList = ({ current, sortBy, order, pageSize, search, ...options }: UseTopicDataOptions) => {
    // Topic names are resolved server-side from Accept-Language (#564) — the
    // current UI language must be part of the key or a language switch keeps
    // serving the names cached in the previous language.
    const { language } = useLanguage();

    return useQuery({
        queryKey: ['TOPICS', current, sortBy, order, pageSize, search, language],
        queryFn: () => getTopicData({ current, sortBy, order, pageSize, search }),
        ...options,
    });
};
