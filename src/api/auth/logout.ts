import { removeAllCookies } from './accessSessionCookie';
import apiKeycloakLogout from './apiLogoutKeycloak';
import { removeTokenExpiryFromLocalStorage } from './accessSessionLocalStorage';
import { invalidateAuthSession } from './invalidateAuthSession';
import routePathNames from '../../appConfig';

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
    const clearUserData = () => {
        localStorage.clear();
        sessionStorage.clear();
    };

    apiKeycloakLogout()
        .then(() => {
            clearUserData();
            return invalidateCookies(withRedirect, redirectUrl);
        })
        .catch(() => {
            clearUserData();
            return invalidateCookies(withRedirect, redirectUrl);
        });
    return null;
};

export default logout;
