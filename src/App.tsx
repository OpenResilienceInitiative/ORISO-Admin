import { Suspense, useEffect } from 'react';
import i18next from 'i18next';
import 'antd/dist/reset.css';
import './styles/App.less';
import './app.css';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import ProtectedPageLayoutWrapper from './components/Layout/ProtectedPageLayoutWrapper';
import { PageLoader } from './components/Layout/PageLoader';
import routePathNames from './appConfig';
import { Initialization } from './components/Layout/Initialization';
import { useTenantData } from './hooks/useTenantData.hook';
import { FeatureProvider } from './context/FeatureContext';
import { useUserPermissions } from './hooks/useUserPermission';
import { PermissionAction } from './enums/PermissionAction';
import { Resource } from './enums/Resource';
import { getDefaultSettingsPath } from './constants/settingsTabs';
import { getSafeFaviconUrl } from './utils/getSafeFaviconUrl';
import { ReleaseToggle } from './enums/ReleaseToggle';
import { useReleasesToggle } from './hooks/useReleasesToggle.hook';
import { usePublicTenantData } from './hooks/usePublicTenantData.hook';
import { useUserRoles } from './hooks/useUserRoles.hook';
import { UserRole } from './enums/UserRole';
import { canReadCaseHandoverAdmin, canSeeSupervisorLogs } from './constants/caseHandoverAccess';
import { useAppConfigContext } from './context/useAppConfig';
import { useAdminTheme } from './hooks/useAdminTheme.hook';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
    LazyAgencyList,
    LazyAgencyPageEdit,
    LazyAppSettingsPage,
    LazyCaseHandoverLogsPage,
    LazyCounsellorInvitesTab,
    LazyExternalInboundsTab,
    LazyGeneralSettingsPage,
    LazyGeneralTenantSettings,
    LazyGlobalLoginSettingsPage,
    LazyInactiveAccountAuditLogsPage,
    LazyInviteLinksPage,
    LazyLegalSettingsPage,
    LazyLinksIndexRedirect,
    LazyLinksPage,
    LazyPermissionsSettingsPage,
    LazySingleLegalSettings,
    LazyStatistic,
    LazySupervisorLogsPage,
    LazyTenantAdminEditOrAdd,
    LazyTenantAppSettings,
    LazyTenantEditOrAdd,
    LazyTenantGlobalSettings,
    LazyTenantSettingsLayout,
    LazyTenantThemeSettings,
    LazyTenantInvitesTab,
    LazyTenantsList,
    LazyTopicEditOrAdd,
    LazyTopicList,
    LazyUnifiedSmtpSettingsPage,
    LazyUserEditOrAdd,
    LazyUserProfile,
    LazyUsersList,
} from './pages/lazyPages';
import { LogsTabsLayout } from './pages/Logs/LogsTabsLayout';
import { useUserData } from './hooks/useUserData.hook';
import { requiresPlatformAdminTwoFactor } from './utils/platformAdminTwoFactorGate';
import { MandatoryTwoFactorSetup } from './pages/Profile/MandatoryTwoFactorSetup';

const AgencyInitialMeetingRedirect = () => {
    const { id } = useParams();

    return <Navigate to={`${routePathNames.agency}/${id}/functionalities`} replace />;
};

export const App = () => {
    const {
        data: publicTenantData,
        isLoading: isPublicTenantLoading,
        isFetched: isPublicTenantFetched,
    } = usePublicTenantData();
    const { isLoading, data } = useTenantData();
    const { isLoading: isUserDataLoading, isError: isUserDataError, data: userData } = useUserData();
    useAdminTheme(publicTenantData?.theming, isPublicTenantFetched || !isPublicTenantLoading);
    const { settings } = useAppConfigContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasRole, isSuperAdmin } = useUserRoles();
    const { can } = useUserPermissions();
    const { isEnabled: isReleaseEnabled } = useReleasesToggle();

    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));

    const defaultSettingsPath = getDefaultSettingsPath({
        isSuperAdmin,
        shouldShowThemeSettings,
        can,
        isTenantSettingsEditEnabled: isReleaseEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT),
        multitenancyWithSingleDomainEnabled: settings.multitenancyWithSingleDomainEnabled,
    });

    // Apply tenant favicon when appearance config is available
    useEffect(() => {
        const favicon = getSafeFaviconUrl(publicTenantData?.theming?.favicon);
        if (!favicon) return;
        const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (link) {
            link.href = favicon;
        }
    }, [publicTenantData?.theming?.favicon]);

    useEffect(() => {
        if (location.pathname === routePathNames.root || location.pathname === `${routePathNames.root}/`) {
            if (can(PermissionAction.Create, Resource.Tenant)) {
                navigate(routePathNames.tenants);
                return;
            }
            if (can(PermissionAction.Read, Resource.Tenant) || can(PermissionAction.Read, Resource.LegalText)) {
                navigate(defaultSettingsPath);
                return;
            }

            let redirectPath = routePathNames.userProfile;
            if (can(PermissionAction.Read, Resource.TenantAdminUser)) {
                redirectPath = routePathNames.tenantAdmins;
            } else if (can(PermissionAction.Read, Resource.AgencyAdminUser)) {
                redirectPath = routePathNames.agencyAdmins;
            } else if (can(PermissionAction.Read, Resource.Consultant)) {
                redirectPath = routePathNames.consultants;
            }
            navigate(redirectPath);
        }
    }, []);

    const canReadTenant = can(PermissionAction.Read, Resource.Tenant);
    const canReadLegalText = can(PermissionAction.Read, Resource.LegalText);
    const canReadStatistic = can(PermissionAction.Read, Resource.Statistic);
    const showCaseHandoverLogs = canReadCaseHandoverAdmin(isSuperAdmin, hasRole, can);
    const showSupervisorLogs = canSeeSupervisorLogs(isSuperAdmin, hasRole, can);
    const requiresTwoFactorSetup = requiresPlatformAdminTwoFactor(isSuperAdmin, userData);

    if (isLoading || (isSuperAdmin && isUserDataLoading)) {
        return <Initialization />;
    }

    if (isSuperAdmin && (isUserDataError || !userData)) {
        return (
            <div role="alert" style={{ maxWidth: '480px', margin: '15vh auto 0', padding: '0 24px' }}>
                <h1 style={{ fontSize: '22px', marginBottom: '8px' }}>
                    {i18next.t('twoFactorAuth.required.title') as string}
                </h1>
                <p style={{ marginBottom: '24px' }}>{i18next.t('error.loading') as string}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{ padding: '8px 16px', cursor: 'pointer' }}
                >
                    {i18next.t('errorBoundary.reload') as string}
                </button>
            </div>
        );
    }

    if (requiresTwoFactorSetup) {
        return (
            <FeatureProvider tenantData={data} publicTenantData={publicTenantData}>
                <ProtectedPageLayoutWrapper>
                    <MandatoryTwoFactorSetup />
                </ProtectedPageLayoutWrapper>
            </FeatureProvider>
        );
    }

    return (
        <FeatureProvider tenantData={data} publicTenantData={publicTenantData}>
            <ProtectedPageLayoutWrapper>
                {/* Page-level boundary: a crash inside one admin page keeps the
                    navigation usable and resets when the route changes. */}
                <ErrorBoundary scope="page" resetKeys={[location.pathname]}>
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            {(canReadTenant || canReadLegalText) && (
                                <Route path={routePathNames.themeSettings} element={<LazyTenantSettingsLayout />}>
                                    {isSuperAdmin && can(PermissionAction.Update, Resource.Tenant) && (
                                        <Route
                                            path={`${routePathNames.themeSettings}/global-config`}
                                            element={<LazyGlobalLoginSettingsPage />}
                                        />
                                    )}
                                    {can(PermissionAction.Read, Resource.Tenant) && (
                                        <Route
                                            path={`${routePathNames.themeSettings}/general`}
                                            element={<LazyGeneralSettingsPage />}
                                        />
                                    )}
                                    {can(PermissionAction.Read, Resource.LegalText) && (
                                        <Route
                                            path={`${routePathNames.themeSettings}/legal`}
                                            element={<LazyLegalSettingsPage />}
                                        />
                                    )}
                                    {can(PermissionAction.Read, Resource.Tenant) && (
                                        <Route
                                            path={`${routePathNames.themeSettings}/app-settings`}
                                            element={<LazyAppSettingsPage />}
                                        />
                                    )}
                                    {can(PermissionAction.Read, Resource.Tenant) && (
                                        <Route
                                            path={`${routePathNames.themeSettings}/smtp`}
                                            element={<LazyUnifiedSmtpSettingsPage />}
                                        />
                                    )}
                                    {can(PermissionAction.Read, Resource.Tenant) && (
                                        <Route
                                            path={`${routePathNames.themeSettings}/permissions`}
                                            element={<LazyPermissionsSettingsPage />}
                                        />
                                    )}
                                    <Route index element={<Navigate to={defaultSettingsPath} replace />} />
                                </Route>
                            )}
                            <Route path={routePathNames.agency} element={<LazyAgencyList />} />
                            <Route path={`${routePathNames.agency}/:id`} element={<LazyAgencyPageEdit />} />
                            <Route path={`${routePathNames.agency}/:id/general`} element={<LazyAgencyPageEdit />} />
                            <Route
                                path={`${routePathNames.agency}/:id/legal-settings`}
                                element={<LazyAgencyPageEdit section="legal" />}
                            />
                            <Route
                                path={`${routePathNames.agency}/:id/functionalities`}
                                element={<LazyAgencyPageEdit section="functionalities" />}
                            />
                            <Route
                                path={`${routePathNames.agency}/:id/initial-meeting`}
                                element={<AgencyInitialMeetingRedirect />}
                            />
                            {can(PermissionAction.Read, Resource.Topic) && (
                                <Route path={routePathNames.topics} element={<LazyTopicList />} />
                            )}
                            {can([PermissionAction.Update, PermissionAction.Create], Resource.Topic) && (
                                <Route path={`${routePathNames.topics}/:id`} element={<LazyTopicEditOrAdd />} />
                            )}
                            <Route
                                path={routePathNames.statisticPreview}
                                element={<Navigate to={routePathNames.statistic} replace />}
                            />
                            <Route
                                path={routePathNames.statistic}
                                element={
                                    canReadStatistic ? (
                                        <LazyStatistic />
                                    ) : (
                                        <Navigate to="/admin/access-denied" replace />
                                    )
                                }
                            />
                            <Route
                                path={routePathNames.logs}
                                element={
                                    showSupervisorLogs ? (
                                        <LazySupervisorLogsPage />
                                    ) : (
                                        <Navigate to="/admin/access-denied" replace />
                                    )
                                }
                            />
                            {/* Unified "Logs": one page, tabs for Inactive (default) + Case handover. */}
                            <Route
                                element={
                                    <LogsTabsLayout
                                        showInactive={isSuperAdmin}
                                        showCaseHandover={showCaseHandoverLogs}
                                    />
                                }
                            >
                                {isSuperAdmin && (
                                    <Route
                                        path={routePathNames.inactiveAccountAuditLogs}
                                        element={<LazyInactiveAccountAuditLogsPage />}
                                    />
                                )}
                                {showCaseHandoverLogs && (
                                    <Route
                                        path={routePathNames.caseHandoverLogs}
                                        element={<LazyCaseHandoverLogsPage />}
                                    />
                                )}
                            </Route>
                            <Route path={routePathNames.userProfile} element={<LazyUserProfile />} />
                            {isSuperAdmin && can(PermissionAction.Update, Resource.Tenant) && (
                                <>
                                    <Route
                                        path={routePathNames.globalSettings}
                                        element={
                                            <Navigate to={`${routePathNames.themeSettings}/global-config`} replace />
                                        }
                                    />
                                    <Route
                                        path={`${routePathNames.globalSettings}/login`}
                                        element={
                                            <Navigate to={`${routePathNames.themeSettings}/global-config`} replace />
                                        }
                                    />
                                    <Route
                                        path={`${routePathNames.globalSettings}/smtp`}
                                        element={<Navigate to={`${routePathNames.themeSettings}/smtp`} replace />}
                                    />
                                </>
                            )}
                            {can(PermissionAction.Create, Resource.Tenant) && (
                                <>
                                    <Route path={routePathNames.tenants} element={<LazyTenantsList />} />
                                    <Route
                                        path={routePathNames.usersTenants}
                                        element={<Navigate to={routePathNames.tenants} replace />}
                                    />
                                    <Route path={`${routePathNames.tenants}/:id`} element={<LazyTenantEditOrAdd />}>
                                        <Route index element={<Navigate to="./general" />} />
                                        <Route
                                            path={`${routePathNames.tenants}/:id/general`}
                                            element={<LazyGeneralTenantSettings />}
                                        />
                                        <Route
                                            path={`${routePathNames.tenants}/:id/theme-settings`}
                                            element={<LazyTenantThemeSettings />}
                                        />
                                        <Route
                                            path={`${routePathNames.tenants}/:id/legal-settings`}
                                            element={<LazySingleLegalSettings />}
                                        />
                                        <Route
                                            path={`${routePathNames.tenants}/:id/app-settings`}
                                            element={<LazyTenantAppSettings />}
                                        />
                                        <Route
                                            path={`${routePathNames.tenants}/:id/global-settings`}
                                            element={<LazyTenantGlobalSettings />}
                                        />
                                    </Route>
                                </>
                            )}
                            <Route path="/admin/users" element={<LazyUsersList />} />
                            <Route path="/admin/users/:typeOfUsers" element={<LazyUsersList />} />
                            <Route path="/admin/users/tenant-admins/:id" element={<LazyTenantAdminEditOrAdd />} />
                            <Route path="/admin/users/platform-admins/:id" element={<LazyTenantAdminEditOrAdd />} />
                            <Route path="/admin/users/:typeOfUsers/:id" element={<LazyUserEditOrAdd />} />
                            <Route path="/admin/invite-links" element={<LazyInviteLinksPage />} />
                            <Route path="/admin/links" element={<LazyLinksPage />}>
                                <Route index element={<LazyLinksIndexRedirect />} />
                                <Route path="tenants" element={<LazyTenantInvitesTab />} />
                                <Route path="counsellor" element={<LazyCounsellorInvitesTab />} />
                                <Route path="external-inbounds" element={<LazyExternalInboundsTab />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </ErrorBoundary>
            </ProtectedPageLayoutWrapper>
        </FeatureProvider>
    );
};
