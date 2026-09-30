import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { topicAdminEndpoint } from '../appConfig';
import { TopicAdminData } from '../types/TopicAdmin';
import { TOPIC_ADMIN_KEY, useTopicAdmin } from './useTopicAdmin';
import { buildTopicRequestBody } from './topicRequestBody';

interface UseAddOrUpdateTopicOptions
    extends UseMutationOptions<TopicAdminData, Error, TopicAdminData, Error | Response> {
    id?: number | string;
}

export const useAddOrUpdateTopicAdmin = ({ id, ...options }: UseAddOrUpdateTopicOptions) => {
    const { data: topicData } = useTopicAdmin({ id, enabled: !!id });
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData) => {
            const bodyData = JSON.stringify(buildTopicRequestBody(topicData, formData));

            return fetchData({
                url: id ? `${topicAdminEndpoint}/${id}` : topicAdminEndpoint,
                method: id ? FETCH_METHODS.PUT : FETCH_METHODS.POST,
                responseHandling: [FETCH_ERRORS.CATCH_ALL, FETCH_SUCCESS.CONTENT],
                bodyData,
            });
        },
        ...options,
        onSuccess: (response, vars, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [TOPIC_ADMIN_KEY] });
            options?.onSuccess?.(response, vars, onMutateResult, context);
        },
    });
};
