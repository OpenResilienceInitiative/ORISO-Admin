import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { topicAdminEndpoint } from '../appConfig';
import type { TopicCatalogueDto } from '../types/TopicCatalogue';

export const TOPIC_CATALOGUE_KEY = 'TOPIC_CATALOGUE';

/** The platform's topic catalogue: categories in order with their topics, and every topic in all languages. */
export const useTopicCatalogue = () =>
    useQuery<TopicCatalogueDto>({
        queryKey: [TOPIC_CATALOGUE_KEY],
        queryFn: () =>
            fetchData({
                url: `${topicAdminEndpoint}/catalogue`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT],
            }),
    });

/** Saves categories, order, pictures and the changed topics in one call. */
export const useSaveTopicCatalogue = () => {
    const queryClient = useQueryClient();
    return useMutation<TopicCatalogueDto, Error | Response, TopicCatalogueDto>({
        mutationFn: (catalogue) =>
            fetchData({
                url: `${topicAdminEndpoint}/catalogue`,
                method: FETCH_METHODS.PUT,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_SUCCESS.CONTENT],
                bodyData: JSON.stringify(catalogue),
            }),
        onSuccess: (saved) => {
            queryClient.setQueryData([TOPIC_CATALOGUE_KEY], saved);
            return queryClient.invalidateQueries({ queryKey: ['TOPICS'] });
        },
    });
};
