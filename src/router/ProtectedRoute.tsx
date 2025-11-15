import React from 'react';
import { Navigate } from 'react-router-dom';
import { useLocation } from 'react-router';
import routePathNames from '../appConfig';
import { getTokenExpiryFromLocalStorage } from '../api/auth/accessSessionLocalStorage';
import { getValueFromCookie } from '../api/auth/accessSessionCookie';
import logout from '../api/auth/logout';

interface ProtectedRouteTypes {
    children: React.ReactNode;
}

/**
 * test if the user is logged in, otherwise redirect to the login page
 * @param children {Component}
 * @constructor
 */
export const ProtectedRoute = ({ children }: ProtectedRouteTypes) => {
    const location = useLocation();
    const currentTime = new Date().getTime();
    const tokenExpiry = getTokenExpiryFromLocalStorage();
    const accessToken = getValueFromCookie('keycloak');
    const refreshToken = getValueFromCookie('refreshToken');

    const accessTokenValidInMs = tokenExpiry.accessTokenValidUntilTime - currentTime;
    const refreshTokenValidInMs = tokenExpiry.refreshTokenValidUntilTime - currentTime;

    // Debug logging
    console.log('🔍 ProtectedRoute: currentTime:', currentTime);
    console.log('🔍 ProtectedRoute: tokenExpiry:', tokenExpiry);
    console.log('🔍 ProtectedRoute: accessToken:', accessToken ? 'present' : 'missing');
    console.log('🔍 ProtectedRoute: refreshToken:', refreshToken ? 'present' : 'missing');
    console.log('🔍 ProtectedRoute: accessTokenValidInMs:', accessTokenValidInMs);
    console.log('🔍 ProtectedRoute: refreshTokenValidInMs:', refreshTokenValidInMs);

    // Check if tokens exist (temporarily relaxed validation for debugging)
    if (!accessToken || !refreshToken) {
        console.log('🔍 ProtectedRoute: No tokens present, redirecting to login');
        console.log('🔍 ProtectedRoute: accessToken present:', !!accessToken);
        console.log('🔍 ProtectedRoute: refreshToken present:', !!refreshToken);
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        logout(true);
        return <Navigate to={routePathNames.login} state={{ from: location }} />;
    }

    // Additional check for expired tokens - redirect to login if both expired
    if (refreshTokenValidInMs <= 0 && accessTokenValidInMs <= 0) {
        console.log('🔍 ProtectedRoute: Tokens expired, redirecting to login');
        logout(true);
        return <Navigate to={routePathNames.login} state={{ from: location }} />;
    }
    // we must return a proper element here :(
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
};
