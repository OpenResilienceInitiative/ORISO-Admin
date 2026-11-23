import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import routePathNames from '../appConfig';
import { getTokenExpiryFromLocalStorage } from '../api/auth/accessSessionLocalStorage';
import { bootstrapAuthSession, getAccessTokenForRequests, getRefreshTokenForRequests } from '../api/auth/auth';
import { agencySetupLoginFromPath } from '../constants/agencySetupContinuation';
import logout, { type LogoutDestination } from '../api/auth/logout';
import { Initialization } from '../components/Layout/Initialization';
import { hasAdminPortalAccess } from '../utils/adminPortalAccess';

interface ProtectedRouteTypes {
    children: React.ReactNode;
}

const roleDeniedDestination = { url: routePathNames.login, replace: true } as const;

const getLogoutDestination = (path: string): LogoutDestination | null => {
    const accessToken = getAccessTokenForRequests();
    const refreshToken = getRefreshTokenForRequests();

    if (!accessToken || !refreshToken) {
        return agencySetupLoginFromPath(path);
    }

    const now = Date.now();
    const { accessTokenValidUntilTime, refreshTokenValidUntilTime } = getTokenExpiryFromLocalStorage();

    if (refreshTokenValidUntilTime <= now && accessTokenValidUntilTime <= now) {
        return agencySetupLoginFromPath(path);
    }

    return hasAdminPortalAccess(accessToken) ? null : roleDeniedDestination;
};

export const ProtectedRoute = ({ children }: ProtectedRouteTypes) => {
    const { pathname } = useLocation();
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

    const logoutDestination = sessionReady ? getLogoutDestination(pathname) : null;
    useEffect(() => {
        if (logoutDestination) {
            logout(true, logoutDestination);
        }
    }, [logoutDestination]);

    // Logout clears the session and navigates. Mounting login here would start a
    // second page's work before that navigation replaces this document.
    if (!sessionReady || logoutDestination) {
        return <Initialization />;
    }

    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{children}</>;
};
