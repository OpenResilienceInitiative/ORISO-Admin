import { useQuery } from '@tanstack/react-query';
import { getDepartmentDpp } from '../api/agency/getDepartmentDpp';

export const DEPARTMENT_DPP_KEY = 'department-dpp';

/** Loads a Fachbereich's (agency × topic) stored data privacy policy to prefill the editor. */
export const useDepartmentDpp = (agencyId: number, topicId: number) =>
    useQuery({
        queryKey: [DEPARTMENT_DPP_KEY, agencyId, topicId],
        queryFn: () => getDepartmentDpp(agencyId, topicId),
        enabled: Number.isFinite(agencyId) && Number.isFinite(topicId),
    });
