import getLocationVariables from './utils/getLocationVariables';

const VITE_CSRF_WHITELIST_HEADER_PROPERTY = import.meta.env.VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const CSRF_WHITELIST_HEADER: string = VITE_CSRF_WHITELIST_HEADER_PROPERTY;
const { subdomain, origin } = getLocationVariables();

let url = origin;

const useHttps = import.meta.env.VITE_USE_HTTPS !== 'false';
const protocol = useHttps ? 'https' : 'http';

if (import.meta.env.VITE_USE_API_URL === 'true') {
    url = `${protocol}://${import.meta.env.VITE_API_URL}`;
} else if (origin.includes('localhost')) {
    url = `${protocol}://${subdomain && `${subdomain}.`}${import.meta.env.VITE_API_URL}`;
}

export const mainURL = url;

export const clusterFeatureFlags = {
    useApiClusterSettings: true, // Fetch server settings from /service/settings
};

export const featureFlags = {
    useConsultingTypesForAgencies: false, // Use consulting types for agency creation
};

export const supportedLanguages = ['de', 'en', 'fr', 'ru', 'tr', 'uk', 'ti'];

export const agencyDataAgencyId = (agencyId: string) => `${mainURL}/service/agencyadmin/agencies/${agencyId}`;
export const agencyEndpointBase = `${mainURL}/service/agencyadmin/agencies`;
export const agencyEventTypes = (agencyId: string) =>
    `${mainURL}/service/appointservice/agencies/${agencyId}/eventTypes`;
export const agencyPostcodeRangeEndpointBase = `${mainURL}/service/agencyadmin/postcoderanges`;
export const consultantsHasAgencyEndpoint = (agencyId: string) =>
    `${mainURL}/service/useradmin/agencies/${agencyId}/consultants`;
export const consultantsForAgencyEndpoint = (agencyId: string) =>
    `${mainURL}/service/appointservice/agencies/${agencyId}/consultants`;
export const consultantsForAgencyEventTypes = (agencyId: string, eventTypeId: number) =>
    `${mainURL}/service/appointservice/agencies/${agencyId}/eventTypes/${eventTypeId}/`;
export const consultantsForAgencyEventTypesNew = (agencyId: string) =>
    `${mainURL}/service/appointservice/agencies/${agencyId}/eventTypes`;
export const consultingTypeEndpoint = `${mainURL}/service/consultingtypes`;
export const counselorEndpoint = `${mainURL}/service/useradmin/consultants`;
export const diocesesEndpoint = `${mainURL}/service/agencyadmin/dioceses`;
export const agencyAdminEndpoint = `${mainURL}/service/useradmin/agencyadmins`;
export const eventTypeById = `${mainURL}/eventTypes/{eventTypeId}`;
export const loginEndpoint = `${mainURL}/auth/realms/online-beratung/protocol/openid-connect/token`;
export const logoutEndpoint = `${mainURL}/auth/realms/online-beratung/protocol/openid-connect/logout`;
export const tenantEndpoint = `${mainURL}/service/tenant/`;
export const tenantAccessEndpoint = `${mainURL}/service/tenant/access`;
export const tenantAdminEndpoint = `${mainURL}/service/tenantadmin`;
export const serverSettingsEndpoint = `${mainURL}/service/settings`;
export const serverSettingsAdminEndpoint = `http://localhost:8083/service/settingsadmin`;
export const baseTenantPublicEndpoint = `${mainURL}/service/tenant/public`;
export const tenantPublicEndpoint = `${baseTenantPublicEndpoint}/${subdomain}`;
export const topicEndpoint = `${mainURL}/service/topic/`;
export const topicAdminEndpoint = `${mainURL}/service/topicadmin`;
export const tenantAdminsEndpoint = `http://localhost:8082/useradmin/tenantadmins`;
export const tenantAdminsSearchEndpoint = `http://localhost:8082/useradmin/tenantadmins/search`;
export const twoFactorAuth = `${mainURL}/service/users/2fa`;
export const twoFactorAuthApp = `${mainURL}/service/users/2fa/app`;
export const twoFactorAuthAppEmail = `${mainURL}/service/users/2fa/email`;
export const userDataEndpoint = `${mainURL}/service/users/data`;
export const usersConsultantEndpoint = `${mainURL}/service/users/consultants`;
export const usersConsultantsSearchEndpoint = `${mainURL}/service/users/consultants/search`;
export const agencyAdminsSearchEndpoint = `${mainURL}/service/useradmin/agencyadmins/search`;
export const registrationDataEndpoint = `${mainURL}/service/statistics/registration`;
export const XHRheader = { AcceptLanguage: 'de' };

/*
 * routes
 */
const routePathNames = {
    root: '/admin',
    login: '/admin/login',
    themeSettings: '/admin/theme-settings',
    users: '/admin/users',
    consultants: '/admin/users/consultants',
    agency: '/admin/agency',
    agencyAdmins: '/admin/users/agency-admins',
    agencyEdit: '/admin/agency/edit',
    agencyEditInitialMeeting: '/admin/agency/:id/initial-meeting',
    agencyAdd: '/admin/agency/add',
    agencyAddGeneral: '/admin/agency/add/general',
    topics: '/admin/topics',
    statistic: '/admin/statistic',
    userProfile: '/admin/profil/',
    termsAndConditions: '/admin/agb',
    imprint: 'https://www.caritas-beratungundhilfe.de/impressum',
    privacy: 'https://www.caritas-beratungundhilfe.de/datenschutz',
    tenants: '/admin/tenants',
    tenantAdmins: '/admin/users/tenant-admins',
    loginResetPasswordLink: '/auth/realms/online-beratung/login-actions/reset-credentials?client_id=account',
    appointmentServiceDevServer: 'https://calcom-develop.suchtberatung.digital',
};

export default routePathNames;
