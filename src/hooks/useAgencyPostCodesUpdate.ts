import { useMutation, useQueryClient } from '@tanstack/react-query';
import updateAgencyPostCodeRange from '../api/agency/updateAgencyPostCodeRange';

export const useAgencyPostCodesUpdate = (id: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => updateAgencyPostCodeRange(id, [], ''),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ['AGENCY_POST_CODES'] });
        },
    });
};
