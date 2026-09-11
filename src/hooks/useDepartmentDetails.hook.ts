import { useQuery } from '@tanstack/react-query';
import { getDepartmentDetails } from '../api/agency/departmentDetails';

export const DEPARTMENT_DETAILS_KEY = 'department-details';

/**
 * Loads a Fachbereich's (agency × topic) stored contact detail overrides to prefill the form.
 * Disabled while no department is selected (pass NaN), mirroring useDepartmentDpp.
 */
export const useDepartmentDetails = (agencyId: number, topicId: number) =>
    useQuery({
        queryKey: [DEPARTMENT_DETAILS_KEY, agencyId, topicId],
        queryFn: () => getDepartmentDetails(agencyId, topicId),
        enabled: Number.isFinite(agencyId) && Number.isFinite(topicId),
    });
