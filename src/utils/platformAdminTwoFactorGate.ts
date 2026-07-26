import { UserData } from '../types/user';

/**
 * Decides whether the admin area stays behind the two-factor setup screen.
 *
 * 2FA is encouraged, not mandatory: an admin who chooses "set up later"
 * (`isSetupDeferred`) reaches the normal screens and can enable it from their
 * profile whenever they want.
 */
export const requiresPlatformAdminTwoFactor = (
    isPlatformAdmin: boolean,
    userData?: UserData,
    isSetupDeferred = false,
): boolean => {
    if (!isPlatformAdmin) return false;
    if (!userData?.twoFactorAuth) return true;
    if (userData.twoFactorAuth.isActive === true) return false;
    if (isSetupDeferred) return false;

    return userData.twoFactorAuth.isToEncourage === true;
};
