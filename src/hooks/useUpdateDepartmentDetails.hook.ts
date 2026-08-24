import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDepartmentDetails } from '../api/agency/departmentDetails';
import { DepartmentDetails } from '../types/departmentDetails';
import { DEPARTMENT_DETAILS_KEY } from './useDepartmentDetails.hook';

/**
 * Stores a Fachbereich's (agency × topic) contact detail overrides. Only overrides are
 * persisted — clearing a field clears the override so the department inherits again.
 */
export const useUpdateDepartmentDetails = (agencyId: number, topicId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (details: DepartmentDetails) => updateDepartmentDetails(agencyId, topicId, details),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [DEPARTMENT_DETAILS_KEY, agencyId, topicId] }),
    });
};
