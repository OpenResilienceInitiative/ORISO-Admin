export interface AppConfigInterface {
    /** Feature flag to enable SSO on budibase */
    budibaseSSO?: boolean; //
    /** Feature flag to enable tenant theming based on subdomains */
    enableTenantTheming?: boolean;
    /** Feature flag to enable walkthrough (false by default here & true in the theme repo) */
    enableWalkThrough?: boolean;
    /** Feature flag to enable Video-Termine page */
    disableVideoAppointments?: boolean;
    /** Feature flag to enable the multi tenancy with a single domain ex: lands */
    multitenancyWithSingleDomainEnabled?: boolean;
    /** Feature flag to enable request to retrieve settings from the tenant service */
    useTenantService?: boolean;
    /** Feature flag to enable cluster settings from the api instead of the config file */
    useApiClusterSettings?: boolean;
    /** When the Feature flag multitenancyWithSingleDomainEnabled is used we need to know the main subdomain */
    mainTenantSubdomainForSingleDomainMultitenancy?: string;
    /** Feature Flag to allow or not the single tenant admins to edit legal texts */
    legalContentChangesBySingleTenantAdminsAllowed?: boolean;
    /** Feature flag for the documentation */
    documentationEnabled?: boolean;
    /** Release toggles */
    releaseToggles?: Record<string, boolean>;
    /** Global SMTP settings for superadmin auth-related mails */
    globalFeatureSystemNotificationEmailsEnabled?: boolean;
    globalSmtpEnabled?: boolean;
    globalSmtpHost?: string;
    globalSmtpPort?: string;
    globalSmtpSecure?: boolean;
    globalSmtpUsername?: string;
    globalSmtpPassword?: string;
    globalSmtpFrom?: string;
    globalSmtpEmailThemeColor?: string;
    tenantAdminControls?: {
        allowedPermissionToggles?: {
            appearance?: boolean;
        };
    };
    serverSettingsMeta?: Record<string, { readOnly?: boolean }>;
}
