import { useMutation, useQueryClient } from '@tanstack/react-query';
import { revertDepartmentLegalText } from '../api/agency/revertDepartmentLegalText';
import { DEPARTMENT_DPP_KEY } from './useDepartmentDpp.hook';
import { DEPARTMENT_IMPRINT_KEY } from './useDepartmentImprint.hook';
import { legalTextVersionsKey } from './useLegalTextVersions.hook';

/** Ends a Fachbereich's own privacy statement or imprint so it inherits the agency text again (#916). */
export const useRevertDepartmentLegalText = (kind: 'privacy' | 'imprint', agencyId: number, topicId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => revertDepartmentLegalText(kind, agencyId, topicId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [kind === 'privacy' ? DEPARTMENT_DPP_KEY : DEPARTMENT_IMPRINT_KEY, agencyId, topicId],
            });
            // The revert closes the open version row, so the cached look-back would still call it current.
            queryClient.invalidateQueries({
                queryKey: legalTextVersionsKey({
                    level: 'department',
                    agencyId,
                    topicId,
                    kind: kind === 'privacy' ? 'DPP' : 'IMPRINT',
                }),
            });
        },
    });
};
