import { keycloakAuthPath, runtimeConfig } from './config/runtimeConfig';
import getLocationVariables from './utils/getLocationVariables';
import { SUPPORTED_LANGUAGE_CODES } from './constants/supportedLanguages';

export const CSRF_WHITELIST_HEADER: string = runtimeConfig.csrfWhitelistHeader;

const { subdomain } = getLocationVariables();

export const mainURL = runtimeConfig.apiBaseUrl;
export const appURL = runtimeConfig.appBaseUrl;
export const matrixURL = runtimeConfig.matrixBaseUrl;
const userServiceURL = runtimeConfig.userServiceOrigin;
const agencyServiceURL = runtimeConfig.agencyServiceOrigin;
export const tenantServiceURL = runtimeConfig.tenantServiceOrigin;
const consultingTypeServiceURL = runtimeConfig.consultingTypeServiceOrigin;

export const clusterFeatureFlags = {
    useApiClusterSettings: true, // Fetch server settings from /service/settings
};

export const supportedLanguages = [...SUPPORTED_LANGUAGE_CODES];

export const agencyDataAgencyId = (agencyId: string) => `${agencyServiceURL}/service/agencyadmin/agencies/${agencyId}`;
export const agencyEndpointBase = `${agencyServiceURL}/service/agencyadmin/agencies`;
export const agencyPostcodeRangeEndpointBase = `${agencyServiceURL}/service/agencyadmin/postcoderanges`;
// TEN-INV ID allocation (#569/#570), wired to the REAL backend contracts:
// live validation is aggregated in UserService (U3), next-free stepping goes
// to the owning services (TenantService U1 / AgencyService U2). Reservation
// itself is server-side on invite creation (allocation modes on
// POST /useradmin/account-invites) — the Admin UI never reserves directly.
export const agencyIdNextFreeEndpoint = `${agencyServiceURL}/service/agencyadmin/agencyids/next-free`;
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
// See agencyIdNextFreeEndpoint above — tenant-ID space (U1).
export const tenantIdNextFreeEndpoint = `${tenantServiceURL}/service/tenantadmin/tenant-ids/next-free`;
// Aggregated tenant/agency ID live validation (UserService U3):
// GET ?tenantId=&agencyId= -> per-ID FREE/RESERVED/ASSIGNED or SERVICE_ERROR.
export const idAllocationValidationEndpoint = `${userServiceURL}/service/useradmin/id-allocation`;
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
export const tutorialProgressEndpoint = `${userServiceURL}/service/users/tutorials/progress`;
export const passwordResetRequestEndpoint = `${userServiceURL}/service/users/password-reset/request`;
export const passwordResetConfirmEndpoint = `${userServiceURL}/service/users/password-reset/confirm`;
// Public (unauthenticated) account-invite base (TEN-INV, #569/#571). The accept
// endpoint `{token}/accept` already lives here (UserService AccountInviteController);
// the U3/U6 onboarding endpoints (`{token}/onboarding[...]`) follow the same
// convention and get verified against the UserService wiring chunks.
export const publicAccountInvitesEndpoint = `${userServiceURL}/service/users/account-invites`;
export const globalSmtpTestEmailEndpoint = `${userServiceURL}/service/users/system-notification-emails/test`;
export const usersConsultantEndpoint = `${userServiceURL}/service/users/consultants`;
export const usersConsultantsSearchEndpoint = `${userServiceURL}/service/users/consultants/search`;
export const supervisorLogsEndpoint = `${userServiceURL}/service/users/supervisors/logs`;
export const caseHandoverLogsEndpoint = `${userServiceURL}/service/users/case-handover/logs`;
export const caseHandoverReasonPoliciesEndpoint = `${userServiceURL}/service/users/case-handover/reason-policies`;
export const inactiveAccountAuditLogsEndpoint = `${userServiceURL}/service/users/inactive-accounts/audit-logs`;
export const agencyAdminsSearchEndpoint = `${userServiceURL}/service/useradmin/agencyadmins/search`;
export const adminStatisticsDashboardEndpoint = `${userServiceURL}/service/useradmin/statistics/dashboard`;
export const tutorialStatisticsEndpoint = `${userServiceURL}/service/useradmin/statistics/tutorials`;
export const invitelinksEndpoint = `${userServiceURL}/service/useradmin/invitelinks`;
export const accountInvitesEndpoint = `${userServiceURL}/service/useradmin/account-invites`;
export const inviteEmailTemplatesEndpoint = `${userServiceURL}/service/useradmin/invite-email-templates`;
export const dpaInviteEmailEndpoint = `${userServiceURL}/service/useradmin/dpa-invites/email`;
export const XHRheader = { AcceptLanguage: 'de' };

/*
 * routes
 */
const routePathNames = {
    root: '/admin',
    login: '/admin/login',
    passwordReset: '/admin/password-reset',
    passwordResetConfirm: '/admin/password-reset/confirm',
    /**
     * Public tenant-admin onboarding (TEN-INV U8, #571). The emailed invite
     * link is `{acceptBaseUrl}/{rawToken}` (UserService AccountInviteService),
     * so the route takes the raw token as a path segment.
     */
    tenantOnboarding: '/admin/tenant-onboarding',
    /**
     * Public counsellor onboarding wizard (#997). Counsellor invite links land
     * here (UserService InviteAcceptUrlBuilder) instead of the app-layer
     * acceptance page; the raw token is the trailing path segment.
     */
    counsellorOnboarding: '/admin/counsellor-onboarding',
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
    links: '/admin/links',
    linksTenants: '/admin/links/tenants',
    linksCounsellor: '/admin/links/counsellor',
    linksExternalInbounds: '/admin/links/external-inbounds',
};

export default routePathNames;
