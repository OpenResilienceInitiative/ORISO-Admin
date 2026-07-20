import { TypeOfUser } from '../enums/TypeOfUser';
import { CounselorData } from '../types/counselor';

export const canGrantConsultantIdentity = (
    isEditing: boolean,
    typeOfUsers: TypeOfUser | undefined,
    editedUser: CounselorData | undefined,
): boolean => {
    const isAdminUserForm = typeOfUsers === TypeOfUser.AgencyAdmins || typeOfUsers === TypeOfUser.TenantAdmins;
    // Explicit `=== false`, not `!hasOtherIdentity`: the field is optional and is
    // only delivered once UserService#490 is live. Until then it is `undefined`,
    // and a truthiness check would flip the gate open — offering "grant" for every
    // admin, including those who already hold the identity. Fail closed instead.
    return isEditing && isAdminUserForm && !!editedUser && editedUser.hasOtherIdentity === false;
};
