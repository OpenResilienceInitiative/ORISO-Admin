import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { deleteAgencyAdminData } from '../api/admins/deleteAgencyAdminData';
import { deleteCounselorData } from '../api/counselor/deleteCounselorData';
import { TypeOfUser } from '../enums/TypeOfUser';

interface DeleteConsultantOrAdminProps extends UseMutationOptions<void, Error, { id: string; forceDelete?: boolean }> {
    typeOfUser: 'consultants' | 'admins';
}
export const useDeleteConsultantOrAgencyAdmin = ({ typeOfUser, ...options }: DeleteConsultantOrAdminProps) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { id: string; forceDelete?: boolean }>({
        mutationFn: ({ id, forceDelete = false }) => {
            return typeOfUser === 'consultants' ? deleteCounselorData(id, forceDelete) : deleteAgencyAdminData(id);
        },
        ...options,
        onSuccess: (responseData, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [TypeOfUser.Consultants.toUpperCase()] });
            queryClient.invalidateQueries({ queryKey: [TypeOfUser.AgencyAdmins.toUpperCase()] });
            options?.onSuccess?.(responseData, variables, onMutateResult, context);
        },
    });
};
