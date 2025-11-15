import { useMutation, UseMutationOptions, useQueryClient } from 'react-query';
import { addAgencyAdminData } from '../api/admins/addAgencyAdminData';
import { editAgencyAdminData } from '../api/admins/ediAgencytAdminData';
import { addCounselorData } from '../api/counselor/addCounselorData';
import { editCounselorData } from '../api/counselor/editCounselorData';
import { TypeOfUser } from '../enums/TypeOfUser';
import { AdminData } from '../types/admin';
import { CounselorData } from '../types/counselor';

interface AddOrUpdateConsultantOptions
    extends UseMutationOptions<CounselorData | AdminData, Error, CounselorData | AdminData, Error | Response> {
    id?: string;
    typeOfUser: TypeOfUser;
}
export const useAddOrUpdateConsultantOrAdmin = ({ id, typeOfUser, ...options }: AddOrUpdateConsultantOptions) => {
    const queryClient = useQueryClient();
    return useMutation(
        (formData) => {
            if (typeOfUser.toLowerCase() === TypeOfUser.Consultants) {
                return id ? editCounselorData(id, formData as CounselorData) : addCounselorData(formData);
            }
            return id ? editAgencyAdminData(id, formData as AdminData) : addAgencyAdminData(formData as AdminData);
        },
        {
            ...options,
            onSuccess: (...all) => {
                queryClient.invalidateQueries({ queryKey: ['HAS_CONSULTANTS'] });
                queryClient.invalidateQueries({ queryKey: [typeOfUser.toUpperCase()] });
                options.onSuccess?.(...all);
            },
        },
    );
};
