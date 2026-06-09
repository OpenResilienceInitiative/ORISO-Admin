import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { deleteAgencyAdminData } from '../api/admins/deleteAgencyAdminData';
import { deleteCounselorData } from '../api/counselor/deleteCounselorData';
import { TypeOfUser } from '../enums/TypeOfUser';

interface DeleteConsultantOrAdminProps extends UseMutationOptions<void, Error, { id: string; forceDelete?: boolean }> {
    typeOfUser: 'consultants' | 'admins';
}
export const useDeleteConsultantOrAgencyAdmin = ({ typeOfUser, ...options }: DeleteConsultantOrAdminProps) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { id: string; forceDelete?: boolean }>(
        ({ id, forceDelete = false }) => {
            return typeOfUser === 'consultants' ? deleteCounselorData(id, forceDelete) : deleteAgencyAdminData(id);
        },
        {
            ...options,
            onSuccess: (responseData, variables, context) => {
                queryClient.invalidateQueries(TypeOfUser.Consultants.toUpperCase());
                queryClient.invalidateQueries(TypeOfUser.AgencyAdmins.toUpperCase());
                options?.onSuccess?.(responseData, variables, context);
            },
        },
    );
};
