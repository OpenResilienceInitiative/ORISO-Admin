import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLocation } from 'react-router';
import routePathNames from '../appConfig';
import { getTokenExpiryFromLocalStorage } from '../api/auth/accessSessionLocalStorage';
import { bootstrapAuthSession, getAccessTokenForRequests, getRefreshTokenForRequests } from '../api/auth/auth';
import logout from '../api/auth/logout';
import { Initialization } from '../components/Layout/Initialization';
import { hasAdminPortalAccess } from '../utils/adminPortalAccess';

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
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        bootstrapAuthSession()
            .then(() => {
                setSessionReady(true);
            })
            .catch(() => {
                setSessionReady(true);
            });
    }, []);

    if (!sessionReady) {
        return <Initialization />;
    }

    const currentTime = new Date().getTime();
    const tokenExpiry = getTokenExpiryFromLocalStorage();
    const accessToken = getAccessTokenForRequests();
    const refreshToken = getRefreshTokenForRequests();

    const accessTokenValidInMs = tokenExpiry.accessTokenValidUntilTime - currentTime;
    const refreshTokenValidInMs = tokenExpiry.refreshTokenValidUntilTime - currentTime;

    if (!accessToken || !refreshToken) {
        logout(true);
        return <Navigate to={routePathNames.login} state={{ from: location }} />;
    }

    if (refreshTokenValidInMs <= 0 && accessTokenValidInMs <= 0) {
        logout(true);
        return <Navigate to={routePathNames.login} state={{ from: location }} />;
    }

    if (!hasAdminPortalAccess(accessToken)) {
        logout(true, routePathNames.login);
        return <Navigate to={routePathNames.login} replace />;
    }

    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
};
