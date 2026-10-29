export const FURTHER_COUNSELLING_POSTCODE_MODES = ['SMART', 'ALWAYS_EMPTY'] as const;
export type FurtherCounsellingPostcodeMode = (typeof FURTHER_COUNSELLING_POSTCODE_MODES)[number];

/** Display order of the admin card. Only the first mode is accepted by CTS until ORISO-Frontend#1878. */
export const TOPIC_DUPLICATE_MODES = [
    'INFORM_EXISTING_COUNSELLOR_ONCE',
    'INFORM_BOTH_ONCE',
    'INFORM_BOTH_EVERY_MESSAGE',
    'FORBID',
] as const;
export type TopicDuplicateMode = (typeof TOPIC_DUPLICATE_MODES)[number];

export interface AppConfigInterface {
    /** Feature flag to enable SSO on budibase */
    budibaseSSO?: boolean; //
    /** Feature flag to enable tenant theming based on subdomains */
    enableTenantTheming?: boolean;
    /** Feature flag to enable walkthrough (false by default here & true in the theme repo) */
    enableWalkThrough?: boolean;
    /** Exact public server key controlling counsellor tours in Help. */
    enableWalkthrough?: boolean;
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
    /** Platform policy (ADR-014 amendment 2026-09-25): every agency holds at most one topic. */
    oneTopicPerAgencyEnabled?: boolean;
    /** Fallback support e-mail shown to counsellors when a centre has no chat-reachable admin (ORISO-Frontend#1915). */
    supportEmail?: string;
    /** ORISO-Frontend#1876: postcode prefill when an asker requests further counselling. */
    furtherCounsellingPostcodeMode?: FurtherCounsellingPostcodeMode;
    /** ORISO-Frontend#1876: reaction to two accepted conversations on the same topic. */
    topicDuplicateMode?: TopicDuplicateMode;
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
