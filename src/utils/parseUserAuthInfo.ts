import { getValueFromCookie } from '../api/auth/accessSessionCookie';
import { UserData } from '../types/user';
import parseJwt from './parseJWT';

/**
 * Parse the user JWT token into valid data to be used in anywhere
 * @returns UserData
 */
export const parseUserAuthInfo = (): Partial<UserData> => {
    const accessToken = getValueFromCookie('keycloak');
    return accessToken ? parseJwt(accessToken || '') : {};
};
