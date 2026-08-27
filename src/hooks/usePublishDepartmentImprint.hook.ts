import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishDepartmentImprint } from '../api/agency/publishDepartmentImprint';
import { DEPARTMENT_IMPRINT_KEY } from './useDepartmentImprint.hook';
import { legalTextVersionsKey } from './useLegalTextVersions.hook';

/** Publishes or draft-saves a Fachbereich's (agency × topic) own imprint. */
export const usePublishDepartmentImprint = (agencyId: number, topicId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ content, publish }: { content: Record<string, string>; publish: boolean }) =>
            publishDepartmentImprint(agencyId, topicId, content, publish),
        onSuccess: (_data, { publish }) => {
            queryClient.invalidateQueries({ queryKey: [DEPARTMENT_IMPRINT_KEY, agencyId, topicId] });
            // Same reason as the DPP counterpart: a publish appends a version, so the cached
            // look-back would otherwise omit the version just created. A draft appends nothing.
            if (publish) {
                queryClient.invalidateQueries({
                    queryKey: legalTextVersionsKey({ level: 'department', agencyId, topicId, kind: 'IMPRINT' }),
                });
            }
        },
    });
};
