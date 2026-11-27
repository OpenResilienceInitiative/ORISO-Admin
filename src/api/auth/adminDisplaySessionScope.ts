import parseJwt from '../../utils/parseJWT';
import { getAdminSessionKey } from './adminTabLogoutSignal';
import { getAccessTokenForRequests } from './auth';

/** Scope UI preferences to the accepted Admin login. Call within the protected route. */
export const getAdminDisplaySessionScope = (): string | null => {
    const session = getAdminSessionKey();
    const token = getAccessTokenForRequests();
    if (!session || !token) return null;

    const claims = parseJwt(token);
    if (typeof claims?.iss !== 'string' || !claims.iss || typeof claims.sub !== 'string' || !claims.sub) return null;

    return JSON.stringify([claims.iss, claims.sub, session]);
};
