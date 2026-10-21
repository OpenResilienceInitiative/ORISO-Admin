import { useCallback } from 'react';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useAccountOperationActions } from './useAccountOperationActions';
import { type AccountOperationVariables, bindAccountOperationMutation } from '../utils/accountMutationIntent';
import { addAgencyAdminData } from '../api/admins/addAgencyAdminData';
import { editAgencyAdminData } from '../api/admins/editAgencyAdminData';
import { addCounselorData } from '../api/counselor/addCounselorData';
import { editCounselorData } from '../api/counselor/editCounselorData';
import { TypeOfUser } from '../enums/TypeOfUser';
import { AdminData } from '../types/admin';
import { CounselorData } from '../types/counselor';
import { AGENCY_CONSULTANTS_KEY } from './useAgencyConsultants';

interface AddOrUpdateConsultantOptions
    extends UseMutationOptions<
        CounselorData | AdminData,
        Error,
        (CounselorData | AdminData) & AccountOperationVariables,
        Error | Response
    > {
    id?: string;
    typeOfUser: TypeOfUser;
}
export const useAddOrUpdateConsultantOrAdmin = ({ id, typeOfUser, ...options }: AddOrUpdateConsultantOptions) => {
    const queryClient = useQueryClient();
    const actions = useAccountOperationActions();
    const mutation = useMutation<
        CounselorData | AdminData,
        Error,
        (CounselorData | AdminData) & AccountOperationVariables,
        Error | Response
    >({
        mutationFn: ({ operationIntent, ...formData }): Promise<CounselorData | AdminData> => {
            if (typeOfUser.toLowerCase() === TypeOfUser.Consultants) {
                return id
                    ? editCounselorData(id, formData as CounselorData, operationIntent)
                    : addCounselorData(formData);
            }
            return id
                ? editAgencyAdminData(id, formData as AdminData, operationIntent)
                : addAgencyAdminData(formData as AdminData);
        },
        ...options,
        onSuccess: (...all) => {
            queryClient.invalidateQueries({ queryKey: ['HAS_CONSULTANTS'] });
            queryClient.invalidateQueries({ queryKey: [AGENCY_CONSULTANTS_KEY] });
            queryClient.invalidateQueries({ queryKey: [typeOfUser.toUpperCase()] });
            // The list key above is plural; the consultant DETAIL entry (`['CONSULTANT', id]`,
            // `useCounselorById`) has its own key and was left stale after every save. Reopening
            // the same consultant then mounted the form from pre-save data — only that record
            // carries publicSlug and the standing supervisor, so the form showed values the
            // backend no longer had.
            queryClient.invalidateQueries({ queryKey: ['CONSULTANT'] });
            options.onSuccess?.(...all);
        },
    });
    // New-account workflows retain their existing checked invitation identity.
    const target = `${typeOfUser}/${id}`;
    const onAccountEdit = useCallback(() => {
        if (id) actions.edited('account-edit', target);
    }, [actions, id, target]);
    if (!id) return { ...mutation, onAccountEdit };
    return {
        ...mutation,
        onAccountEdit,
        mutate: bindAccountOperationMutation(actions, 'account-edit', target, mutation.mutate),
        mutateAsync: bindAccountOperationMutation(actions, 'account-edit', target, mutation.mutateAsync),
    };
};
