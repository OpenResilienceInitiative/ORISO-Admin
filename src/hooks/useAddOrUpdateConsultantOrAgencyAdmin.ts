import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { addAgencyAdminData } from '../api/admins/addAgencyAdminData';
import { editAgencyAdminData } from '../api/admins/editAgencyAdminData';
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
    return useMutation<CounselorData | AdminData, Error, CounselorData | AdminData, Error | Response>({
        mutationFn: (formData): Promise<CounselorData | AdminData> => {
            if (typeOfUser.toLowerCase() === TypeOfUser.Consultants) {
                return id ? editCounselorData(id, formData as CounselorData) : addCounselorData(formData);
            }
            return id ? editAgencyAdminData(id, formData as AdminData) : addAgencyAdminData(formData as AdminData);
        },
        ...options,
        onSuccess: (...all) => {
            queryClient.invalidateQueries({ queryKey: ['HAS_CONSULTANTS'] });
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
};
