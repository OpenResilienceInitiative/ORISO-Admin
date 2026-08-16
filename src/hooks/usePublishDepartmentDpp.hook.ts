import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishDepartmentDpp } from '../api/agency/publishDepartmentDpp';
import { DEPARTMENT_DPP_KEY } from './useDepartmentDpp.hook';
import { legalTextVersionsKey } from './useLegalTextVersions.hook';

interface PublishDepartmentDppVariables {
    /** Language → HTML map of the department data privacy policy. */
    content: Record<string, string>;
    /** true = publish (final), false = draft-save. */
    publish: boolean;
    /** Language → consent sentence; omitted when the backend has no consent field yet. */
    consentText?: Record<string, string>;
}

/** Publishes or draft-saves a Fachbereich's (agency × topic) own data privacy policy. */
export const usePublishDepartmentDpp = (agencyId: number, topicId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ content, publish, consentText }: PublishDepartmentDppVariables) =>
            publishDepartmentDpp(agencyId, topicId, content, publish, consentText),
        onSuccess: (_data, { publish }) => {
            queryClient.invalidateQueries({ queryKey: [DEPARTMENT_DPP_KEY, agencyId, topicId] });
            // A publish appends a version — the look-back menu would otherwise keep
            // serving the cached history and omit the version just created. A draft
            // save appends nothing, so its history is still current.
            if (publish) {
                queryClient.invalidateQueries({
                    queryKey: legalTextVersionsKey({ level: 'department', agencyId, topicId, kind: 'dpp' }),
                });
            }
        },
    });
};
