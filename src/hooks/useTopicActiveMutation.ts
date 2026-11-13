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
                // Silent: the page shows ONE message that names the topic. A 403 must not throw the
                // whole page to the access-denied screen either, the switch just says it failed.
                responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT],
            });
            // The PUT replaces the whole topic: without the stored record it would wipe the rest.
            if (!stored) throw new Error(FETCH_ERRORS.EMPTY);
            return fetchData({
                url: `${topicAdminEndpoint}/${id}`,
                method: FETCH_METHODS.PUT,
                responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_SUCCESS.CONTENT],
                bodyData: JSON.stringify(buildTopicRequestBody(stored, { status: active })),
            });
        },
        // Returned, so the mutation (and the switch's pending state) lasts until the list is fresh:
        // otherwise the switch would unlock on the old value and jump back for a moment.
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['TOPICS'] }),
                queryClient.invalidateQueries({ queryKey: [TOPIC_ADMIN_KEY] }),
            ]),
    });
};
