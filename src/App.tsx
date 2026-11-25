import { Suspense, useEffect, type ReactElement } from 'react';
import i18next from 'i18next';
import 'antd/dist/reset.css';
import './styles/App.less';
import './app.css';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminNotFound } from './pages/ErrorPages/AdminNotFound';
import ProtectedPageLayoutWrapper from './components/Layout/ProtectedPageLayoutWrapper';
import { PageLoader } from './components/Layout/PageLoader';
import routePathNames from './appConfig';
import { canOpenTenantLegalSettings } from './constants/agencyAdminLanding';
import { Initialization } from './components/Layout/Initialization';
import { useTenantData } from './hooks/useTenantData.hook';
import { FeatureProvider } from './context/FeatureContext';
import { useUserPermissions } from './hooks/useUserPermission';
import { PermissionAction } from './enums/PermissionAction';
import { Resource } from './enums/Resource';
import { getDefaultSettingsPath } from './constants/settingsTabs';
import { TenantFavicon } from './components/TenantFavicon/TenantFavicon';
import { ReleaseToggle } from './enums/ReleaseToggle';
import { useReleasesToggle } from './hooks/useReleasesToggle.hook';
import { usePublicTenantData } from './hooks/usePublicTenantData.hook';
import { useUserRoles } from './hooks/useUserRoles.hook';
import { resolveVisibleLinksTabs } from './constants/linksAccess';
import { canSeeAddonsSection } from './constants/addonsAccess';
import { UserRole } from './enums/UserRole';
import {
    canReadCaseHandoverAdmin,
    canSeeDeletionAuditLogsFor,
    canSeeSupervisorLogs,
} from './constants/caseHandoverAccess';
import { useAppConfigContext } from './context/useAppConfig';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AgencyDefaultSectionRedirect } from './pages/Agency/Edit/AgencyDefaultSectionRedirect';
import { LegacyAppSettingsRedirect } from './pages/Tenants/Edit/LegacyAppSettingsRedirect';
import {
    LazyAddonAdminPage,
    LazyAddonAuditLogsPage,
    LazyAddonsLayout,
    LazyAddonsOverview,
    LazyAgencyList,
    LazyAgencySetupPage,
    LazyAgencyPageEdit,
    LazyAppSettingsPage,
    LazyCaseHandoverLogsPage,
    LazyCounsellorInvitesTab,
    LazyErstantwortSettingsPage,
    LazyGreetingSettingsPage,
    LazyGeneralSettingsPage,
    LazyGeneralTenantSettings,
    LazyGlobalLoginSettingsPage,
    LazyDeletionAuditLogsPage,
    LazyInactiveAccountAuditLogsPage,
    LazyLegalSettingsPage,
    LazyLinksIndexRedirect,
    LazyLinksPage,
    LazyPermissionsSettingsPage,
    LazySingleLegalSettings,
    LazyStatistic,
    LazyStatisticsReaderEditOrAdd,
    LazyHomePage,
    LazySupervisorLogsPage,
    LazyServiceNoticesPage,
    LazyTenantAdminEditOrAdd,
    LazyTenantAppSettings,
    LazyTenantSmtpSettings,
    LazyTenantErstantwortSettings,
    LazyTenantEditOrAdd,
    LazyTenantGlobalSettings,
    LazyTenantSettingsLayout,
    LazyTenantThemeSettings,
    LazyTenantInvitesTab,
    LazyTenantsList,
    LazyTopicEditOrAdd,
    LazyTopicList,
    LazyTopicSettingsPage,
    LazyUnifiedSmtpSettingsPage,
    LazyUserEditOrAdd,
    LazyUserProfile,
    LazyUsersList,
} from './pages/lazyPages';
import { LogsTabsLayout } from './pages/Logs/LogsTabsLayout';
import { useUserData } from './hooks/useUserData.hook';
import { useAccountInactivityActivity } from './hooks/useAccountInactivityActivity.hook';
import { DpaBlockerGate } from './components/DpaBlocker/DpaBlockerGate';
import { hasMandatoryTwoFactorRole, requiresMandatoryTwoFactor } from './utils/adminTwoFactorGate';
import { MandatoryTwoFactorSetup } from './pages/Profile/MandatoryTwoFactorSetup';
import { StatisticsReaderRoutes } from './router/StatisticsReaderRoutes';

const accessDenied = <Navigate to="/admin/access-denied" replace />;

const requireRouteAccess = (allowed: boolean, page: ReactElement) => (allowed ? page : accessDenied);

const AgencyInitialMeetingRedirect = () => {
    const { id } = useParams();

    return <Navigate to={`${routePathNames.agency}/${id}/functionalities`} replace />;
};

export const App = () => {
    useAccountInactivityActivity();
    const { data: publicTenantData } = usePublicTenantData();
    const { isLoading, data } = useTenantData();
    const { isLoading: isUserDataLoading, isError: isUserDataError, data: userData } = useUserData();
    const { settings } = useAppConfigContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasRole, isSuperAdmin, isStatisticsReader, roles, isTechnicalAccount, tokenUnreadable } = useUserRoles();

    /**
     * Accounts that have to prove a second factor before any admin screen
     * renders (#891). Kept separate from the gate itself so the loading and
     * error branches below can hold these accounts too: rendering the admin
     * area while the profile — and with it the 2FA state — is still unknown
     * would be the very bypass this gate exists to close.
     */
    const mustProveTwoFactor = tokenUnreadable || (!isTechnicalAccount && hasMandatoryTwoFactorRole(roles));
    const canManageServiceNotices = isSuperAdmin && !isTechnicalAccount && !tokenUnreadable;
    const { can } = useUserPermissions();
    const { isEnabled: isReleaseEnabled } = useReleasesToggle();

    const shouldShowThemeSettings =
        (settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.TenantAdmin)) ||
        (!settings.multitenancyWithSingleDomainEnabled && hasRole(UserRole.SingleTenantAdmin));

    const defaultSettingsPath = getDefaultSettingsPath({
        isSuperAdmin,
        canManageServiceNotices,
        shouldShowThemeSettings,
        can,
        isTenantSettingsEditEnabled: isReleaseEnabled(ReleaseToggle.TENANT_ADMIN_SETTINGS_EDIT),
    });

    useEffect(() => {
        // Every role starts at Home (ORISO-Admin#1323). It only links to areas the
        // admin may open, so the per-role landing chain that lived here is gone.
        // A Statistik-Leser·in has no Home and starts at statistics (ORISO-UserService#1666).
        if (location.pathname === routePathNames.root || location.pathname === `${routePathNames.root}/`) {
            navigate(isStatisticsReader ? routePathNames.statistic : routePathNames.home);
        }
    }, []);

    const canReadTenant = can(PermissionAction.Read, Resource.Tenant);
    const canReadLegalText = canOpenTenantLegalSettings(can(PermissionAction.Read, Resource.LegalText), hasRole);
    const canManageTenant = can(PermissionAction.Create, Resource.Tenant);
    const canManageGlobalSettings = isSuperAdmin && can(PermissionAction.Update, Resource.Tenant);
    const canReadTopics = can(PermissionAction.Read, Resource.Topic);
    const canEditTopics = can([PermissionAction.Update, PermissionAction.Create], Resource.Topic);
    const topicsAvailable = canReadTopics || canEditTopics || Boolean(data?.settings?.featureTopicsEnabled);
    const canOpenSettings = canReadTenant || canReadLegalText;
    const settingsRoutes = [
        {
            path: `${routePathNames.themeSettings}/global-config`,
            allowed: canManageGlobalSettings,
            page: <LazyGlobalLoginSettingsPage />,
        },
        {
            path: `${routePathNames.themeSettings}/master-data`,
            allowed: canReadTenant,
            page: <LazyGeneralSettingsPage section="masterData" />,
        },
        {
            path: `${routePathNames.themeSettings}/general`,
            allowed: canReadTenant,
            page: <LazyGeneralSettingsPage section="appearance" />,
        },
        { path: `${routePathNames.themeSettings}/legal`, allowed: canReadLegalText, page: <LazyLegalSettingsPage /> },
        {
            path: `${routePathNames.themeSettings}/greeting`,
            allowed: isSuperAdmin && can(PermissionAction.Update, Resource.Tenant),
            page: <LazyGreetingSettingsPage />,
        },
        {
            path: `${routePathNames.themeSettings}/erstantwort`,
            allowed: !isSuperAdmin && canReadTenant,
            page: <LazyErstantwortSettingsPage />,
        },
        {
            path: `${routePathNames.themeSettings}/topics`,
            allowed: isSuperAdmin && can(PermissionAction.Update, Resource.Topic),
            page: <LazyTopicSettingsPage />,
        },
        {
            path: `${routePathNames.themeSettings}/app-settings`,
            allowed: canReadTenant,
            page: <LazyAppSettingsPage />,
        },
        { path: `${routePathNames.themeSettings}/smtp`, allowed: canReadTenant, page: <LazyUnifiedSmtpSettingsPage /> },
        {
            path: `${routePathNames.themeSettings}/permissions`,
            allowed: canReadTenant,
            page: <LazyPermissionsSettingsPage />,
        },
        { path: routePathNames.serviceNotices, allowed: canManageServiceNotices, page: <LazyServiceNoticesPage /> },
    ];
    const canReadStatistic = can(PermissionAction.Read, Resource.Statistic);
    const showCaseHandoverLogs = canReadCaseHandoverAdmin(isSuperAdmin, can);
    const visibleLinksTabs = resolveVisibleLinksTabs({ isSuperAdmin, hasRole });
    const showSupervisorLogs = canSeeSupervisorLogs(isSuperAdmin, can);
    // Platform admins only — the backend answers 403 to every other role.
    const canSeeDeletionAuditLogs = canSeeDeletionAuditLogsFor(isSuperAdmin, can);
    const showAddons = canSeeAddonsSection({ isSuperAdmin, can });
    const requiresTwoFactorSetup = requiresMandatoryTwoFactor({
        roles,
        isTechnicalAccount,
        tokenUnreadable,
        userData,
    });

    if (isLoading || (mustProveTwoFactor && isUserDataLoading)) {
        return <Initialization />;
    }

    if (mustProveTwoFactor && (isUserDataError || !userData)) {
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
                {/* The DPA gate applies to tenant-scoped admins; agency admins are exempt. If both gates apply to a tenant admin, the DPA lock wins. */}
                <DpaBlockerGate>
                    <ProtectedPageLayoutWrapper restricted>
                        <MandatoryTwoFactorSetup />
                    </ProtectedPageLayoutWrapper>
                </DpaBlockerGate>
            </FeatureProvider>
        );
    }

    if (isStatisticsReader) {
        // ORISO-UserService#1666: a Statistik-Leser·in gets statistics and the own profile only;
        // every other admin address redirects to statistics.
        return (
            <FeatureProvider tenantData={data} publicTenantData={publicTenantData}>
                <DpaBlockerGate>
                    <ProtectedPageLayoutWrapper>
                        <ErrorBoundary scope="page" resetKeys={[location.pathname]}>
                            <Suspense fallback={<PageLoader />}>
                                <StatisticsReaderRoutes
                                    statistic={
                                        canReadStatistic ? (
                                            <LazyStatistic />
                                        ) : (
                                            <Navigate to="/admin/access-denied" replace />
                                        )
                                    }
                                    profile={<LazyUserProfile />}
                                />
                            </Suspense>
                        </ErrorBoundary>
                    </ProtectedPageLayoutWrapper>
                </DpaBlockerGate>
            </FeatureProvider>
        );
    }

    return (
        <FeatureProvider tenantData={data} publicTenantData={publicTenantData}>
            {/* The signed-in admin's tenant icon takes precedence over the platform default. */}
            <TenantFavicon tenantFavicon={data?.theming?.favicon} />
            {/* TEN-INV-U10 (#572): global non-bypassable DPA blocker. Wraps the WHOLE
                protected tree, so every direct URL renders the blocker instead of the
                page while the tenant's DPA is unsigned/outdated. */}
            <DpaBlockerGate>
                <ProtectedPageLayoutWrapper>
                    {/* Page-level boundary: a crash inside one admin page keeps the
                    navigation usable and resets when the route changes. */}
                    <ErrorBoundary scope="page" resetKeys={[location.pathname]}>
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                {canOpenSettings ? (
                                    <Route path={routePathNames.themeSettings} element={<LazyTenantSettingsLayout />}>
                                        {settingsRoutes
                                            .filter(({ allowed }) => allowed)
                                            .map(({ path, page }) => (
                                                <Route key={path} path={path} element={page} />
                                            ))}
                                        <Route index element={<Navigate to={defaultSettingsPath} replace />} />
                                    </Route>
                                ) : (
                                    <Route path={routePathNames.themeSettings} element={accessDenied} />
                                )}
                                {/* Denied settings URLs stay outside the layout so they do not load its data. */}
                                {settingsRoutes
                                    .filter(({ allowed }) => !canOpenSettings || !allowed)
                                    .map(({ path }) => (
                                        <Route key={path} path={path} element={accessDenied} />
                                    ))}
                                <Route path={routePathNames.agency} element={<LazyAgencyList />} />
                                <Route path={`${routePathNames.agency}/:id/setup`} element={<LazyAgencySetupPage />} />
                                <Route
                                    path={`${routePathNames.agency}/:id`}
                                    element={<AgencyDefaultSectionRedirect />}
                                />
                                <Route path={`${routePathNames.agency}/:id/general`} element={<LazyAgencyPageEdit />} />
                                <Route
                                    path={`${routePathNames.agency}/:id/legal-settings`}
                                    element={<LazyAgencyPageEdit section="legal" />}
                                />
                                <Route
                                    path={`${routePathNames.agency}/:id/erstantwort`}
                                    element={<LazyAgencyPageEdit section="erstantwort" />}
                                />
                                <Route
                                    path={`${routePathNames.agency}/:id/functionalities`}
                                    element={<LazyAgencyPageEdit section="functionalities" />}
                                />
                                <Route
                                    path={`${routePathNames.agency}/:id/initial-meeting`}
                                    element={<AgencyInitialMeetingRedirect />}
                                />
                                {topicsAvailable && (
                                    <>
                                        <Route
                                            path={routePathNames.topics}
                                            element={requireRouteAccess(
                                                canReadTopics,
                                                isSuperAdmin ? (
                                                    // The platform admin keeps the catalogue under Settings → Themen.
                                                    <Navigate to={`${routePathNames.themeSettings}/topics`} replace />
                                                ) : (
                                                    <LazyTopicList />
                                                ),
                                            )}
                                        />
                                        <Route
                                            path={`${routePathNames.topics}/:id`}
                                            element={requireRouteAccess(canEditTopics, <LazyTopicEditOrAdd />)}
                                        />
                                    </>
                                )}
                                {/* Start page for every role (ORISO-Admin#1323). */}
                                <Route path={routePathNames.home} element={<LazyHomePage />} />
                                {/* Bare /admin goes to Home; without this the catch-all below would flash "not found". */}
                                <Route
                                    path={routePathNames.root}
                                    element={<Navigate to={routePathNames.home} replace />}
                                />
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
                                {/* One "Logs" section for every role: tabs for Supervision, Case
                                    handover and the inactive-account audit, filtered to what the
                                    current admin may read (ORISO-Admin#84). */}
                                <Route
                                    element={
                                        <LogsTabsLayout
                                            showSupervisor={showSupervisorLogs}
                                            showCaseHandover={showCaseHandoverLogs}
                                            showInactive={isSuperAdmin}
                                            showDeletion={canSeeDeletionAuditLogs}
                                            showAddons={showAddons}
                                        />
                                    }
                                >
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
                                    <Route
                                        path={routePathNames.inactiveAccountAuditLogs}
                                        element={requireRouteAccess(isSuperAdmin, <LazyInactiveAccountAuditLogsPage />)}
                                    />
                                    <Route
                                        path={routePathNames.deletionAuditLogs}
                                        element={requireRouteAccess(
                                            canSeeDeletionAuditLogs,
                                            <LazyDeletionAuditLogsPage />,
                                        )}
                                    />
                                    <Route
                                        path={routePathNames.caseHandoverLogs}
                                        element={requireRouteAccess(showCaseHandoverLogs, <LazyCaseHandoverLogsPage />)}
                                    />
                                    <Route
                                        path={routePathNames.addonAuditLogs}
                                        element={requireRouteAccess(showAddons, <LazyAddonAuditLogsPage />)}
                                    />
                                </Route>
                                <Route path={routePathNames.userProfile} element={<LazyUserProfile />} />
                                <Route
                                    path={routePathNames.globalSettings}
                                    element={requireRouteAccess(
                                        canManageGlobalSettings,
                                        <Navigate to={`${routePathNames.themeSettings}/global-config`} replace />,
                                    )}
                                />
                                <Route
                                    path={`${routePathNames.globalSettings}/login`}
                                    element={requireRouteAccess(
                                        canManageGlobalSettings,
                                        <Navigate to={`${routePathNames.themeSettings}/global-config`} replace />,
                                    )}
                                />
                                <Route
                                    path={`${routePathNames.globalSettings}/smtp`}
                                    element={requireRouteAccess(
                                        canManageGlobalSettings,
                                        <Navigate to={`${routePathNames.themeSettings}/smtp`} replace />,
                                    )}
                                />
                                <Route
                                    path={routePathNames.tenants}
                                    element={requireRouteAccess(canManageTenant, <LazyTenantsList />)}
                                />
                                {/* Tenant readers use the users tab; platform admins open the dedicated tenant page. */}
                                {(canManageTenant || !canReadTenant) && (
                                    <Route
                                        path={routePathNames.usersTenants}
                                        element={requireRouteAccess(
                                            canManageTenant,
                                            <Navigate to={routePathNames.tenants} replace />,
                                        )}
                                    />
                                )}
                                <Route
                                    path={`${routePathNames.tenants}/:id`}
                                    element={requireRouteAccess(canManageTenant, <LazyTenantEditOrAdd />)}
                                >
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
                                        path={`${routePathNames.tenants}/:id/erstantwort`}
                                        element={<LazyTenantErstantwortSettings />}
                                    />
                                    <Route
                                        path={`${routePathNames.tenants}/:id/smtp`}
                                        element={<LazyTenantSmtpSettings />}
                                    />
                                    <Route
                                        path={`${routePathNames.tenants}/:id/functionalities`}
                                        element={<LazyTenantAppSettings />}
                                    />
                                    <Route
                                        path={`${routePathNames.tenants}/:id/app-settings`}
                                        element={<LegacyAppSettingsRedirect />}
                                    />
                                    <Route
                                        path={`${routePathNames.tenants}/:id/global-settings`}
                                        element={<LazyTenantGlobalSettings />}
                                    />
                                </Route>
                                <Route path="/admin/users" element={<LazyUsersList />} />
                                <Route path="/admin/users/:typeOfUsers" element={<LazyUsersList />} />
                                <Route path="/admin/users/tenant-admins/:id" element={<LazyTenantAdminEditOrAdd />} />
                                <Route path="/admin/users/platform-admins/:id" element={<LazyTenantAdminEditOrAdd />} />
                                <Route
                                    path={`${routePathNames.statisticsReaders}/:id`}
                                    element={<LazyStatisticsReaderEditOrAdd />}
                                />
                                <Route path="/admin/users/:typeOfUsers/:id" element={<LazyUserEditOrAdd />} />
                                <Route
                                    path={routePathNames.addons}
                                    element={requireRouteAccess(showAddons, <LazyAddonsLayout />)}
                                >
                                    <Route index element={<LazyAddonsOverview />} />
                                    <Route path="apps/:addonName/:appId" element={<LazyAddonAdminPage />} />
                                    {showAddons && (
                                        <Route path="*" element={<Navigate to={routePathNames.addons} replace />} />
                                    )}
                                </Route>
                                {visibleLinksTabs.length > 0 && (
                                    <Route path="/admin/links" element={<LazyLinksPage />}>
                                        <Route index element={<LazyLinksIndexRedirect />} />
                                        {visibleLinksTabs.includes('tenants') && (
                                            <Route path="tenants" element={<LazyTenantInvitesTab />} />
                                        )}
                                        {visibleLinksTabs.includes('counsellor') && (
                                            <Route path="counsellor" element={<LazyCounsellorInvitesTab />} />
                                        )}
                                        {/* Live-chat links moved to Funktionszugriff (ORISO-Admin#1321);
                                            the old address keeps working for bookmarks. */}
                                        <Route
                                            path="external-inbounds"
                                            element={
                                                <Navigate to={`${routePathNames.themeSettings}/permissions`} replace />
                                            }
                                        />
                                        <Route path="*" element={<LazyLinksIndexRedirect />} />
                                    </Route>
                                )}
                                {/* Last on purpose: an address no route above answers gets a clear
                                    "page not found" inside the shell, not a blank content area (#1513). */}
                                <Route path="*" element={<AdminNotFound />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </ProtectedPageLayoutWrapper>
            </DpaBlockerGate>
        </FeatureProvider>
    );
};
