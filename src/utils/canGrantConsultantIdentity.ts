import { TypeOfUser } from '../enums/TypeOfUser';
import { CounselorData } from '../types/counselor';

export const canGrantConsultantIdentity = (
    isEditing: boolean,
    typeOfUsers: TypeOfUser | undefined,
    editedUser: CounselorData | undefined,
): boolean => {
    const isAdminUserForm = typeOfUsers === TypeOfUser.AgencyAdmins || typeOfUsers === TypeOfUser.TenantAdmins;
    return isEditing && isAdminUserForm && !!editedUser && !editedUser.hasOtherIdentity;
};
