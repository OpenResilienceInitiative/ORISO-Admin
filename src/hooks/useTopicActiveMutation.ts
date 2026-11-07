import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { topicAdminEndpoint } from '../appConfig';
import { TopicAdminData } from '../types/TopicAdmin';
import { buildTopicRequestBody } from './topicRequestBody';
import { TOPIC_ADMIN_KEY } from './useTopicAdmin';

/**
 * Switches one topic visible (ACTIVE) or hidden (INACTIVE) from the catalogue. The PUT replaces the
 * whole topic, so the stored record is read first and only `status` changes in what is sent back.
 */
export const useTopicActiveMutation = () => {
    const queryClient = useQueryClient();

    return useMutation<unknown, Error | Response, { id: number; active: boolean }>({
        mutationFn: async ({ id, active }) => {
            const stored: TopicAdminData = await fetchData({
                url: `${topicAdminEndpoint}/${id}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL],
            });
            return fetchData({
                url: `${topicAdminEndpoint}/${id}`,
                method: FETCH_METHODS.PUT,
                responseHandling: [FETCH_ERRORS.CATCH_ALL, FETCH_SUCCESS.CONTENT],
                bodyData: JSON.stringify(buildTopicRequestBody(stored, { status: active })),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['TOPICS'] });
            queryClient.invalidateQueries({ queryKey: [TOPIC_ADMIN_KEY] });
        },
    });
};
