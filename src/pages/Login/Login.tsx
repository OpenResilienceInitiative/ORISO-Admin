import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { Col, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import Stage from './Stage';
import PublicPageLayoutWrapper from '../../components/Layout/PublicPageLayoutWrapper';
import LoginForm from './LoginForm';
import routePathNames from '../../appConfig';
import { getValueFromCookie } from '../../api/auth/accessSessionCookie';
import { getTokenExpiryFromLocalStorage } from '../../api/auth/accessSessionLocalStorage';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { usePublicTenantData } from '../../hooks/usePublicTenantData.hook';
import { UserRole } from '../../enums/UserRole';
import { useAppConfigContext } from '../../context/useAppConfig';

/**
 * login component
 * checks if the users token is still valid
 * @constructor
 */
export const Login = () => {
    const { settings } = useAppConfigContext();
    const accessToken = getValueFromCookie('keycloak');
    const currentTime = new Date().getTime();
    const tokenExpiry = getTokenExpiryFromLocalStorage();
    const { data: tenantData } = usePublicTenantData();
    const { hasRole } = useUserRoles();
    const accessTokenValidInMs = tokenExpiry.accessTokenValidUntilTime - currentTime;

    const refreshTokenValidInMs = tokenExpiry.refreshTokenValidUntilTime - currentTime;

    const [redirectUrl, setRedirectUrl] = useState('');
    const { t } = useTranslation();
    /**
     * redirect user if authed
     * using different route if isSuperAdmin
     */
    useEffect(() => {
        if (hasRole(UserRole.TenantAdmin) && accessToken && refreshTokenValidInMs > 0 && accessTokenValidInMs > 0) {
            setRedirectUrl(routePathNames.tenants);
        } else if (accessToken && refreshTokenValidInMs > 0 && accessTokenValidInMs > 0 && tenantData) {
            const redirectPath =
                (settings.mainTenantSubdomainForSingleDomainMultitenancy && hasRole(UserRole.TenantAdmin)) ||
                !settings.mainTenantSubdomainForSingleDomainMultitenancy
                    ? routePathNames.themeSettings
                    : routePathNames.consultants;
            setRedirectUrl(redirectPath);
        }
    }, [accessToken, accessTokenValidInMs, refreshTokenValidInMs, tenantData, t, hasRole(UserRole.TenantAdmin)]);

    return redirectUrl ? (
        <Navigate to={redirectUrl} />
    ) : (
        <PublicPageLayoutWrapper className="login flex-col flex">
            <Stage />
            <Row align="middle" style={{ flex: '1 0 auto' }}>
                <Col xs={{ span: 10, offset: 1 }} md={{ span: 6, offset: 3 }} xl={{ span: 4, offset: 6 }}>
                    <LoginForm />
                </Col>
            </Row>
        </PublicPageLayoutWrapper>
    );
};
