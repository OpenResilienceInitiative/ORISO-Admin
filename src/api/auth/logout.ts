import { removeAllCookies } from './accessSessionCookie';
import apiKeycloakLogout from './apiLogoutKeycloak';
import { removeTokenExpiryFromLocalStorage } from './accessSessionLocalStorage';
import { invalidateAuthSession } from './invalidateAuthSession';
import { clearAdminLocalStorage } from './clearAdminWebStorage';
import routePathNames from '../../appConfig';
import { agencySetupLoginFromPath } from '../../constants/agencySetupContinuation';

let isRequestInProgress = false;

const redirectAfterLogout = (altRedirectUrl?: string) => {
    const redirectUrl = altRedirectUrl || routePathNames.login;
    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 100);
};

const invalidateCookies = async (withRedirect = true, redirectUrl?: string) => {
    await invalidateAuthSession();
    removeAllCookies();
    removeTokenExpiryFromLocalStorage();
    if (withRedirect) {
        redirectAfterLogout(redirectUrl);
    }
};

const logout = (withRedirect = true, redirectUrl?: string): any => {
    if (isRequestInProgress) {
        return null;
    }
    isRequestInProgress = true;
    // Capture the internal continuation before asynchronous cleanup or route changes.
    // Explicit destinations (including login after a role denial) retain their intent.
    const destination = redirectUrl ?? agencySetupLoginFromPath(window.location.pathname);
    const clearUserData = () => {
        clearAdminLocalStorage();
        sessionStorage.clear();
    };

    apiKeycloakLogout()
        .then(() => {
            clearUserData();
            return invalidateCookies(withRedirect, destination);
        })
        .catch(() => {
            clearUserData();
            return invalidateCookies(withRedirect, destination);
        });
    return null;
};

export default logout;
