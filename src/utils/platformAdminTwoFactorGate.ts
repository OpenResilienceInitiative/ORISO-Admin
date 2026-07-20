import { UserData } from '../types/user';

export const requiresPlatformAdminTwoFactor = (isPlatformAdmin: boolean, userData?: UserData): boolean => {
    if (!isPlatformAdmin) return false;
    if (!userData?.twoFactorAuth) return true;

    return userData.twoFactorAuth.isToEncourage === true && userData.twoFactorAuth.isActive !== true;
};
