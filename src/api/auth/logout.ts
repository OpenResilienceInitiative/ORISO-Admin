import { removeAllCookies } from './accessSessionCookie';
import apiKeycloakLogout from './apiLogoutKeycloak';
import { removeTokenExpiryFromLocalStorage } from './accessSessionLocalStorage';
import { invalidateAuthSession } from './invalidateAuthSession';
import { clearAdminLocalStorage, clearAdminSessionStorage } from './clearAdminWebStorage';
import {
    ADMIN_TAB_LOGOUT_KEY,
    getAdminSessionKey,
    getLoggedOutAdminSessionKey,
    publishAdminTabLogout,
    rememberAdminTabLogout,
} from './adminTabLogoutSignal';
import { clearSessionTokens } from './tokenSessionStore';
import routePathNames from '../../appConfig';
import { agencySetupLoginFromPath } from '../../constants/agencySetupContinuation';

let isRequestInProgress = false;
let peerLogoutApplied = false;

const applyPeerLogout = (sessionKey: string, withRedirect = true) => {
    if (peerLogoutApplied) return;
    peerLogoutApplied = true;
    clearSessionTokens();
    clearAdminSessionStorage();
    rememberAdminTabLogout(sessionKey);
    if (withRedirect) window.location.replace(agencySetupLoginFromPath(window.location.pathname));
};

export const installAdminTabLogoutListener = (): (() => void) => {
    const onStorage = (event: StorageEvent) => {
        if (
            event.key === ADMIN_TAB_LOGOUT_KEY &&
            event.storageArea === window.localStorage &&
            event.newValue !== null &&
            event.newValue === getAdminSessionKey()
        ) {
            applyPeerLogout(event.newValue);
        }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
};

export type LogoutDestination = string | { url: string; replace: true };

const redirectAfterLogout = (destination: LogoutDestination) => {
    setTimeout(() => {
        if (typeof destination === 'string') {
            window.location.href = destination || routePathNames.login;
        } else {
            window.location.replace(destination.url);
        }
    }, 100);
};

const invalidateCookies = async (
    withRedirect: boolean,
    destination: LogoutDestination,
    signedOutSession: string | null,
) => {
    await invalidateAuthSession();
    removeAllCookies();
    removeTokenExpiryFromLocalStorage();
    if (signedOutSession) publishAdminTabLogout(signedOutSession);
    if (withRedirect) {
        redirectAfterLogout(destination);
    }
};

const logout = (withRedirect = true, redirect?: LogoutDestination, source?: 'explicit'): null => {
    if (peerLogoutApplied) return null;
    const loggedOutSession = getLoggedOutAdminSessionKey();
    if (loggedOutSession !== null) {
        applyPeerLogout(loggedOutSession, withRedirect);
        return null;
    }
    if (isRequestInProgress) {
        return null;
    }
    isRequestInProgress = true;
    // Capture the internal continuation before asynchronous cleanup or route changes.
    // Explicit destinations (including login after a role denial) retain their intent.
    const destination = redirect ?? agencySetupLoginFromPath(window.location.pathname);
    const signedOutSession = source === 'explicit' ? getAdminSessionKey() : null;
    const clearUserData = () => {
        clearAdminLocalStorage();
        sessionStorage.clear();
    };

    apiKeycloakLogout()
        .then(() => {
            clearUserData();
            return invalidateCookies(withRedirect, destination, signedOutSession);
        })
        .catch(() => {
            clearUserData();
            return invalidateCookies(withRedirect, destination, signedOutSession);
        });
    return null;
};

export default logout;
