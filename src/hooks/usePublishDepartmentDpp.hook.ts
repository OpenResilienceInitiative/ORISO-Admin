import { useMutation } from '@tanstack/react-query';
import { publishDepartmentDpp } from '../api/agency/publishDepartmentDpp';

interface PublishDepartmentDppVariables {
    /** Language → HTML map of the department data privacy policy. */
    content: Record<string, string>;
    /** true = publish (final), false = draft-save. */
    publish: boolean;
}

/** Publishes or draft-saves a Fachbereich's (agency × topic) own data privacy policy. */
export const usePublishDepartmentDpp = (agencyId: number, topicId: number) =>
    useMutation({
        mutationFn: ({ content, publish }: PublishDepartmentDppVariables) =>
            publishDepartmentDpp(agencyId, topicId, content, publish),
    });
