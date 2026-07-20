import { UserData } from '../types/user';

export const requiresPlatformAdminTwoFactor = (isPlatformAdmin: boolean, userData?: UserData): boolean =>
    isPlatformAdmin && userData?.twoFactorAuth?.isToEncourage === true && userData.twoFactorAuth.isActive !== true;
