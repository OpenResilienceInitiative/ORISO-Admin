import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { deleteAgencyAdminData } from '../api/admins/deleteAgencyAdminData';
import { deleteCounselorData } from '../api/counselor/deleteCounselorData';
import { TypeOfUser } from '../enums/TypeOfUser';
import { useIdentityRemovalCommand } from './useIdentityRemovalCommand';

interface DeleteConsultantOrAdminProps extends UseMutationOptions<void, Error, { id: string; forceDelete?: boolean }> {
    typeOfUser: 'consultants' | 'admins';
}
export const useDeleteConsultantOrAgencyAdmin = ({ typeOfUser, ...options }: DeleteConsultantOrAdminProps) => {
    const queryClient = useQueryClient();
    const remove = useIdentityRemovalCommand(`remove-${typeOfUser}-identity`);

    return useMutation<void, Error, { id: string; forceDelete?: boolean }>({
        mutationFn: ({ id, forceDelete = false }) =>
            remove(id, { forceDelete }, (payload, intent) =>
                typeOfUser === 'consultants'
                    ? deleteCounselorData(id, payload.forceDelete, intent)
                    : deleteAgencyAdminData(id, intent),
            ),
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [TypeOfUser.Consultants.toUpperCase()] });
            queryClient.invalidateQueries({ queryKey: [TypeOfUser.AgencyAdmins.toUpperCase()] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};
