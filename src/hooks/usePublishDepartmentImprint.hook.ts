import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishDepartmentImprint } from '../api/agency/publishDepartmentImprint';
import { DEPARTMENT_IMPRINT_KEY } from './useDepartmentImprint.hook';

export const usePublishDepartmentImprint = (agencyId: number, topicId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ content, publish }: { content: Record<string, string>; publish: boolean }) =>
            publishDepartmentImprint(agencyId, topicId, content, publish),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [DEPARTMENT_IMPRINT_KEY, agencyId, topicId] }),
    });
};
