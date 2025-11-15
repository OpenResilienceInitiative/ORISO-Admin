import { useEffect } from 'react';
import './styles/App.less';
import './app.css';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import ProtectedPageLayoutWrapper from './components/Layout/ProtectedPageLayoutWrapper';
import routePathNames from './appConfig';
import { TenantSettingsLayout } from './pages/TenantSettings';
import { TopicList } from './pages/Topics/List/TopicList';
import { Statistic } from './pages/Statistic';
import { UserProfile } from './pages/Profile/UserProfile';
import { Initialization } from './components/Layout/Initialization';
import { AgencyList } from './pages/Agency/List';
import { useTenantData } from './hooks/useTenantData.hook';
import { FeatureProvider } from './context/FeatureContext';
import { AgencyPageEdit } from './pages/Agency/Edit';
import { UsersList } from './pages/users/List';
import { UserEditOrAdd } from './pages/users/Edit';
import { GeneralSettingsPage } from './pages/TenantSettings/GeneralSettings';
import { LegalSettingsPage } from './pages/TenantSettings/LegalSettings';
import { useUserPermissions } from './hooks/useUserPermission';
import { PermissionAction } from './enums/PermissionAction';
import { Resource } from './enums/Resource';
import { TopicEditOrAdd } from './pages/Topics/Edit';
import { TenantsList } from './pages/Tenants/List';
import { TenantEditOrAdd } from './pages/Tenants/Edit';
import { TenantAdminEditOrAdd } from './pages/users/TenantAdminEdit';
import { GeneralTenantSettings } from './pages/Tenants/Edit/General';
import { TenantThemeSettings } from './pages/Tenants/Edit/ThemeSettings';
import { TenantAppSettings } from './pages/Tenants/Edit/AppSettings';
import { SingleLegalSettings } from './pages/Tenants/Edit/LegalSettings';
import { AppSettingsPage } from './pages/TenantSettings/AppSettings';
import { usePublicTenantData } from './hooks/usePublicTenantData.hook';
import { useUserRoles } from './hooks/useUserRoles.hook';
import { UserRole } from './enums/UserRole';
import { useAppConfigContext } from './context/useAppConfig';
import { AgencyEditInitialMeeting } from './pages/Agency/EditInitialMeeting';

export const App = () => {
    const { data: publicTenantData } = usePublicTenantData();
    const { isLoading, data } = useTenantData();
    const { settings } = useAppConfigContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasRole } = useUserRoles();
    const { can } = useUserPermissions();

    console.log('🔍 App: isLoading:', isLoading);
    console.log('🔍 App: tenant data:', data);
    console.log('🔍 App: publicTenantData:', publicTenantData);
    console.log('🔍 App: settings:', settings);

    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));

    useEffect(() => {
        if (location.pathname === routePathNames.root || location.pathname === `${routePathNames.root}/`) {
            if (can(PermissionAction.Read, Resource.Tenant)) {
                navigate(routePathNames.themeSettings);
                return;
            }

            const redirectPath =
                can(PermissionAction.Read, Resource.Consultant) || can(PermissionAction.Read, Resource.AgencyAdminUser)
                    ? routePathNames.consultants
                    : routePathNames.userProfile;
            navigate(redirectPath);
        }
    }, []);

    console.log('🔍 App: About to check isLoading:', isLoading);
    console.log('🔍 App: Will show Initialization?', isLoading);

    const canReadTenant = can(PermissionAction.Read, Resource.Tenant);
    const canReadLegalText = can(PermissionAction.Read, Resource.LegalText);
    console.log('🔍 App: canReadTenant:', canReadTenant);
    console.log('🔍 App: canReadLegalText:', canReadLegalText);
    console.log('🔍 App: Will show routes?', canReadTenant || canReadLegalText);

    return isLoading ? (
        <Initialization />
    ) : (
        <FeatureProvider tenantData={data} publicTenantData={publicTenantData}>
            <ProtectedPageLayoutWrapper>
                <Routes>
                    {(canReadTenant || canReadLegalText) && (
                        <Route path={routePathNames.themeSettings} element={<TenantSettingsLayout />}>
                            {can(PermissionAction.Read, Resource.Tenant) && (
                                <Route
                                    path={`${routePathNames.themeSettings}/general`}
                                    element={<GeneralSettingsPage />}
                                />
                            )}
                            {can(PermissionAction.Read, Resource.LegalText) && (
                                <Route path={`${routePathNames.themeSettings}/legal`} element={<LegalSettingsPage />} />
                            )}
                            {can(PermissionAction.Read, Resource.Tenant) && (
                                <Route
                                    path={`${routePathNames.themeSettings}/app-settings`}
                                    element={<AppSettingsPage />}
                                />
                            )}
                            <Route
                                index
                                element={
                                    <Navigate
                                        to={`${routePathNames.themeSettings}/${
                                            can(PermissionAction.Update, Resource.Tenant) && shouldShowThemeSettings
                                                ? 'general'
                                                : 'legal'
                                        }`}
                                    />
                                }
                            />
                        </Route>
                    )}
                    <Route path={routePathNames.agency} element={<AgencyList />} />
                    <Route path={`${routePathNames.agency}/:id`} element={<AgencyPageEdit />} />
                    <Route path={`${routePathNames.agency}/:id/general`} element={<AgencyPageEdit />} />
                    <Route
                        path={`${routePathNames.agency}/:id/initial-meeting`}
                        element={<AgencyEditInitialMeeting />}
                    />
                    {can(PermissionAction.Read, Resource.Topic) && (
                        <Route path={routePathNames.topics} element={<TopicList />} />
                    )}
                    {can([PermissionAction.Update, PermissionAction.Create], Resource.Topic) && (
                        <Route path={`${routePathNames.topics}/:id`} element={<TopicEditOrAdd />} />
                    )}
                    <Route path={routePathNames.statistic} element={<Statistic />} />
                    <Route path={routePathNames.userProfile} element={<UserProfile />} />
                    {can(PermissionAction.Create, Resource.Tenant) && (
                        <>
                            <Route path={routePathNames.tenants} element={<TenantsList />} />
                            <Route path={`${routePathNames.tenants}/:id`} element={<TenantEditOrAdd />}>
                                <Route index element={<Navigate to="./general" />} />
                                <Route
                                    path={`${routePathNames.tenants}/:id/general`}
                                    element={<GeneralTenantSettings />}
                                />
                                <Route
                                    path={`${routePathNames.tenants}/:id/theme-settings`}
                                    element={<TenantThemeSettings />}
                                />
                                <Route
                                    path={`${routePathNames.tenants}/:id/legal-settings`}
                                    element={<SingleLegalSettings />}
                                />
                                <Route
                                    path={`${routePathNames.tenants}/:id/app-settings`}
                                    element={<TenantAppSettings />}
                                />
                            </Route>
                        </>
                    )}
                    <Route path="/admin/users/:typeOfUsers" element={<UsersList />} />
                    <Route path="/admin/users/tenant-admins/:id" element={<TenantAdminEditOrAdd />} />
                    <Route path="/admin/users/:typeOfUsers/:id" element={<UserEditOrAdd />} />
                </Routes>
            </ProtectedPageLayoutWrapper>
        </FeatureProvider>
    );
};
