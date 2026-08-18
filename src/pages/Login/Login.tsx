import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { Col, Row } from 'antd';
import Stage from './Stage';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import LoginForm from './LoginForm';
import routePathNames from '../../appConfig';
import { bootstrapAuthSession, getAccessTokenForRequests } from '../../api/auth/auth';
import { getTokenExpiryFromLocalStorage } from '../../api/auth/accessSessionLocalStorage';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { UserRole } from '../../enums/UserRole';
import { useAppConfigContext } from '../../context/useAppConfig';

export interface LoginSurfaceProps {
    /** Platform logo from Theme settings → Appearance (#594.14). */
    logo?: string | null;
}

/**
 * The public sign-in SURFACE, without any session logic: dark stage panel on
 * the left, form column on the right, and the footer menu (Imprint, Privacy,
 * language) in the bottom left of that panel (#594.15b).
 *
 * Extracted from {@link Login} so a story can show the very same markup the
 * route renders — #594 asks for the login and the onboarding page to be
 * comparable side by side, and a story that rebuilds the markup would drift.
 */
export const LoginSurface = ({ logo }: LoginSurfaceProps) => (
    <PublicPageLayoutWrapper className="login flex-col flex" footerVariant="stage">
        <Stage logo={logo} />
        <Row align="middle" style={{ flex: '1 0 auto' }}>
            <Col xs={{ span: 22, offset: 1 }} md={{ span: 6, offset: 3 }} xl={{ span: 4, offset: 6 }}>
                <LoginForm />
            </Col>
        </Row>
    </PublicPageLayoutWrapper>
);

/**
 * login component
 * checks if the users token is still valid
 * @constructor
 */
export const Login = () => {
    const { settings } = useAppConfigContext();
    const [sessionReady, setSessionReady] = useState(false);
    const accessToken = getAccessTokenForRequests();
    const currentTime = Date.now();
    const tokenExpiry = getTokenExpiryFromLocalStorage();
    const { data: tenantData } = usePublicTenantData();
    const logo = tenantData?.theming?.logo;
    const { hasRole, isTechnicalAccount } = useUserRoles();
    const accessTokenValidInMs = tokenExpiry.accessTokenValidUntilTime - currentTime;

    const refreshTokenValidInMs = tokenExpiry.refreshTokenValidUntilTime - currentTime;

    const [redirectUrl, setRedirectUrl] = useState('');
    const isTenantAdmin = hasRole(UserRole.TenantAdmin);
    const isAdminUser = hasRole([
        UserRole.TenantAdmin,
        UserRole.SingleTenantAdmin,
        UserRole.UserAdmin,
        UserRole.AgencyAdmin,
        UserRole.RestrictedAgencyAdmin,
        UserRole.TopicAdmin,
    ]);
    /**
     * redirect user if authed
     * using different route if isSuperAdmin
     */
    useEffect(() => {
        bootstrapAuthSession().finally(() => {
            setSessionReady(true);
        });
    }, []);

    useEffect(() => {
        if (!sessionReady) {
            return;
        }

        if (!accessToken || refreshTokenValidInMs <= 0 || accessTokenValidInMs <= 0) {
            return;
        }

        // Technical/system users are reserved for background/system operations.
        if (isTechnicalAccount || !isAdminUser) {
            return;
        }

        if (isTenantAdmin) {
            setRedirectUrl(routePathNames.consultants);
        } else if (tenantData) {
            const redirectPath =
                (settings.mainTenantSubdomainForSingleDomainMultitenancy && isTenantAdmin) ||
                !settings.mainTenantSubdomainForSingleDomainMultitenancy
                    ? routePathNames.themeSettings
                    : routePathNames.consultants;
            setRedirectUrl(redirectPath);
        }
    }, [
        sessionReady,
        accessToken,
        accessTokenValidInMs,
        refreshTokenValidInMs,
        tenantData,
        isTechnicalAccount,
        isAdminUser,
        isTenantAdmin,
        settings.mainTenantSubdomainForSingleDomainMultitenancy,
    ]);

    return redirectUrl ? <Navigate to={redirectUrl} /> : <LoginSurface logo={logo} />;
};
