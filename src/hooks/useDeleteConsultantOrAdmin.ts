import { useMutation, UseMutationOptions } from 'react-query';
import { deleteAgencyAdminData } from '../api/admins/deleteAgencyAdminData';
import { deleteCounselorData } from '../api/counselor/deleteCounselorData';

interface DeleteConsultantOrAdminProps extends UseMutationOptions<void, Error, { id: string; forceDelete?: boolean }> {
    typeOfUser: 'consultants' | 'admins';
}
export const useDeleteConsultantOrAgencyAdmin = ({ typeOfUser, ...options }: DeleteConsultantOrAdminProps) => {
    return useMutation<void, Error, { id: string; forceDelete?: boolean }>(({ id, forceDelete = false }) => {
        return typeOfUser === 'consultants' ? deleteCounselorData(id, forceDelete) : deleteAgencyAdminData(id);
    }, options);
};
