import { keycloakAuthPath, runtimeConfig } from './config/runtimeConfig';
import getLocationVariables from './utils/getLocationVariables';

export const CSRF_WHITELIST_HEADER: string = runtimeConfig.csrfWhitelistHeader;

const { subdomain } = getLocationVariables();

export const mainURL = runtimeConfig.apiBaseUrl;
export const appURL = runtimeConfig.appBaseUrl;
export const matrixURL = runtimeConfig.matrixBaseUrl;
const userServiceURL = runtimeConfig.userServiceOrigin;
const agencyServiceURL = runtimeConfig.agencyServiceOrigin;
const tenantServiceURL = runtimeConfig.tenantServiceOrigin;
const consultingTypeServiceURL = runtimeConfig.consultingTypeServiceOrigin;

export const clusterFeatureFlags = {
    useApiClusterSettings: true, // Fetch server settings from /service/settings
};

export const supportedLanguages = ['de', 'en', 'fr', 'ru', 'tr', 'uk', 'ti'];

export const agencyDataAgencyId = (agencyId: string) => `${agencyServiceURL}/service/agencyadmin/agencies/${agencyId}`;
export const agencyEndpointBase = `${agencyServiceURL}/service/agencyadmin/agencies`;
export const agencyPostcodeRangeEndpointBase = `${agencyServiceURL}/service/agencyadmin/postcoderanges`;
export const consultantsHasAgencyEndpoint = (agencyId: string) =>
    `${userServiceURL}/service/useradmin/agencies/${agencyId}/consultants`;
export const consultingTypeEndpoint = `${consultingTypeServiceURL}/service/consultingtypes`;
export const counselorEndpoint = `${userServiceURL}/service/useradmin/consultants`;
// Unauthenticated client error intake (OBS-P3, ORISO-Helm#62): logs into
// SigNoz via UserService's existing structured logger.
export const errorReportEndpoint = `${userServiceURL}/service/error-reports`;
export const agencyAdminEndpoint = `${userServiceURL}/service/useradmin/agencyadmins`;
export const grantConsultantIdentityEndpoint = (adminId: string) =>
    `${userServiceURL}/service/useradmin/admins/${adminId}/grant-consultant-identity`;
export const loginEndpoint = keycloakAuthPath('/protocol/openid-connect/token');
export const logoutEndpoint = keycloakAuthPath('/protocol/openid-connect/logout');
export const tenantEndpoint = `${tenantServiceURL}/service/tenant/`;
export const tenantAccessEndpoint = `${tenantServiceURL}/service/tenant/access`;
export const tenantAdminEndpoint = `${tenantServiceURL}/service/tenantadmin`;
export const serverSettingsEndpoint = `${consultingTypeServiceURL}/service/settings`;
export const serverSettingsAdminEndpoint = `${consultingTypeServiceURL}/service/settingsadmin`;
export const baseTenantPublicEndpoint = `${tenantServiceURL}/service/tenant/public`;
export const tenantPublicEndpoint = `${baseTenantPublicEndpoint}/${subdomain}`;
export const topicEndpoint = `${consultingTypeServiceURL}/service/topic/`;
export const topicAdminEndpoint = `${agencyServiceURL}/service/topicadmin`;
export const tenantAdminsEndpoint = `${userServiceURL}/service/useradmin/tenantadmins`;
export const tenantAdminsSearchEndpoint = `${userServiceURL}/service/useradmin/tenantadmins/search`;
export const twoFactorAuth = `${userServiceURL}/service/users/2fa`;
export const twoFactorAuthApp = `${userServiceURL}/service/users/2fa/app`;
export const twoFactorAuthAppEmail = `${userServiceURL}/service/users/2fa/email`;
export const userDataEndpoint = `${userServiceURL}/service/users/data`;
export const userAdminDataEndpoint = `${userServiceURL}/service/useradmin/data`;
export const userPasswordChangeEndpoint = `${userServiceURL}/service/users/password/change`;
export const globalSmtpTestEmailEndpoint = `${userServiceURL}/service/users/system-notification-emails/test`;
export const usersConsultantEndpoint = `${userServiceURL}/service/users/consultants`;
export const usersConsultantsSearchEndpoint = `${userServiceURL}/service/users/consultants/search`;
export const supervisorLogsEndpoint = `${userServiceURL}/service/users/supervisors/logs`;
export const caseHandoverLogsEndpoint = `${userServiceURL}/service/users/case-handover/logs`;
export const caseHandoverReasonPoliciesEndpoint = `${userServiceURL}/service/users/case-handover/reason-policies`;
export const inactiveAccountAuditLogsEndpoint = `${userServiceURL}/service/users/inactive-accounts/audit-logs`;
export const agencyAdminsSearchEndpoint = `${userServiceURL}/service/useradmin/agencyadmins/search`;
export const registrationDataEndpoint = `${mainURL}/service/statistics/registration`;
export const adminStatisticsDashboardEndpoint = `${userServiceURL}/service/useradmin/statistics/dashboard`;
export const invitelinksEndpoint = `${userServiceURL}/service/useradmin/invitelinks`;
export const accountInvitesEndpoint = `${userServiceURL}/service/useradmin/account-invites`;
export const inviteEmailTemplatesEndpoint = `${userServiceURL}/service/useradmin/invite-email-templates`;
export const XHRheader = { AcceptLanguage: 'de' };

/*
 * routes
 */
const routePathNames = {
    root: '/admin',
    login: '/admin/login',
    themeSettings: '/admin/theme-settings',
    globalSettings: '/admin/global-settings',
    permissionsSettings: '/admin/theme-settings/permissions',
    users: '/admin/users',
    consultants: '/admin/users/consultants',
    agency: '/admin/agency',
    agencyAdmins: '/admin/users/agency-admins',
    agencyEdit: '/admin/agency/edit',
    agencyAdd: '/admin/agency/add',
    agencyAddGeneral: '/admin/agency/add/general',
    topics: '/admin/topics',
    statistic: '/admin/statistic',
    statisticPreview: '/admin/statistic-preview',
    logs: '/admin/logs',
    caseHandoverLogs: '/admin/logs/case-handover',
    inactiveAccountAuditLogs: '/admin/logs/inactive-accounts',
    userProfile: '/admin/profil/',
    termsAndConditions: '/admin/agb',
    imprint: '/impressum',
    privacy: '/datenschutz',
    tenants: '/admin/tenants',
    usersTenants: '/admin/users/tenants',
    tenantAdmins: '/admin/users/tenant-admins',
    platformAdmins: '/admin/users/platform-admins',
    inviteLinks: '/admin/invite-links',
    links: '/admin/links',
    linksTenants: '/admin/links/tenants',
    linksCounsellor: '/admin/links/counsellor',
    linksExternalInbounds: '/admin/links/external-inbounds',
    loginResetPasswordLink: keycloakAuthPath('/login-actions/reset-credentials?client_id=account'),
};

export default routePathNames;
