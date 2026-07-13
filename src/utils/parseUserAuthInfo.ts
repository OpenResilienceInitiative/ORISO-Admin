import { getAccessTokenForRequests } from '../api/auth/auth';
import { UserData } from '../types/user';
import parseJwt from './parseJWT';

/**
 * Parse the user JWT token into valid data to be used in anywhere
 * @returns UserData
 */
export const parseUserAuthInfo = (): Partial<UserData> => {
    const accessToken = getAccessTokenForRequests();
    return (accessToken ? parseJwt(accessToken) : null) ?? {};
};
