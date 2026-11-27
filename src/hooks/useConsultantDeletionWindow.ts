import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { cancelCounselorDeletion } from '../api/counselor/cancelCounselorDeletion';
import { pauseCounselorDeletion } from '../api/counselor/pauseCounselorDeletion';
import { TypeOfUser } from '../enums/TypeOfUser';

type CancelOptions = Omit<UseMutationOptions<unknown, unknown, string>, 'mutationFn'>;
type PauseVariables = { id: string; reason: string; months: number };
type PauseOptions = Omit<UseMutationOptions<unknown, unknown, PauseVariables>, 'mutationFn'>;

/** Both change what the consultant list shows (status, window), so they refresh it. */
const useRefreshConsultants = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: [TypeOfUser.Consultants.toUpperCase()] });
};

export const useCancelConsultantDeletion = (options: CancelOptions = {}) => {
    const refresh = useRefreshConsultants();
    return useMutation<unknown, unknown, string>({
        ...options,
        mutationFn: (id) => cancelCounselorDeletion(id),
        onSuccess: (data, variables, onMutateResult, context) => {
            refresh();
            options.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
};

export const usePauseConsultantDeletion = (options: PauseOptions = {}) => {
    const refresh = useRefreshConsultants();
    return useMutation<unknown, unknown, PauseVariables>({
        ...options,
        mutationFn: ({ id, reason, months }) => pauseCounselorDeletion(id, { reason, months }),
        onSuccess: (data, variables, onMutateResult, context) => {
            refresh();
            options.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
};
