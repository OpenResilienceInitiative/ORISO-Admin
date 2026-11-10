import routePathNames from '../../appConfig';
import type { CanFn } from '../../constants/caseHandoverAccess';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import { UserRole } from '../../enums/UserRole';
import type { SearchLevel } from './searchTypes';

/**
 * Everything the admin search knows about the screens (ORISO-Admin, global search).
 *
 * Routes, tabs and *which admin may open them* are NOT written down here a second
 * time: they come from the builders the navigation already uses
 * (`buildAdminNavItems`, `buildAdminNavTree`, which wrap `getSettingsTabs`,
 * `getUserSections`, `resolveVisibleLinksTabs` and the log gates). What this file
 * adds is what those builders cannot know: **the tiles inside the tabs** and the
 * words people use for them.
 *
 * Adding a tile = one `tile(...)` line, its synonyms in `searchKeywords.ts` (same
 * id). `searchRegistry.test.ts` fails when a key is missing in German or English
 * and when a tile title is no longer found in its source file, so renames cannot
 * silently break the search.
 */

/** What the index needs to know about the signed-in admin and where they are. */
export interface SearchContext {
    isSuperAdmin: boolean;
    isTenantAdmin: boolean;
    /** Service accounts never get the personal cards that make an admin a counsellor. */
    isTechnicalAccount: boolean;
    hasRole: (role: UserRole | UserRole[]) => boolean;
    /** `settings.documentationEnabled`: the account page only shows the Documentation card when it is on. */
    documentationEnabled: boolean;
    /** `multitenancyWithSingleDomainEnabled`: tenant admins work on one shared domain. */
    singleDomain: boolean;
    can: CanFn;
    /** Nav item key → route, exactly the items the sidebar shows (`home`, `theme`, `tenants`, `account` …). */
    navTo: Record<string, string>;
    /** Subsection id → route, from `buildAdminNavTree` (`settings:legal`, `users:counsellors` …). */
    subTo: Record<string, string>;
    /** Träger the admin is looking at right now (route `/admin/tenants/:id/*`). */
    tenant?: { id: string; name?: string };
    /** Beratungsstelle in context: route `/admin/agency/:id/*`, or the admin's only one. */
    agency?: { id: string; name?: string };
}

/** Who sees a tile on top of its tab. */
export type TileGate = 'platform' | 'singleDomain' | 'multiTenant' | 'notTenantAdmin' | 'selfCounsel' | 'documentation';

/** The admin roles that see "make me a counsellor" on the account page (rule of `SelfConsultantIdentity`). */
export const SELF_COUNSEL_ROLES = [
    UserRole.AgencyAdmin,
    UserRole.RestrictedAgencyAdmin,
    UserRole.TenantAdmin,
    UserRole.SingleTenantAdmin,
];

export const TILE_GATES: Record<TileGate, (context: SearchContext) => boolean> = {
    platform: (context) => context.isSuperAdmin,
    singleDomain: (context) => context.singleDomain,
    multiTenant: (context) => !context.singleDomain,
    notTenantAdmin: (context) => !context.isTenantAdmin,
    // The card renders nothing for platform admins, service accounts and accounts without an admin role.
    selfCounsel: (context) =>
        !context.isSuperAdmin && !context.isTechnicalAccount && context.hasRole(SELF_COUNSEL_ROLES),
    // `UserProfile` renders the card only when the app config turns documentation on.
    documentation: (context) => context.documentationEnabled,
};

export interface RegistryTile {
    /** Stable id, also the key into `SEARCH_KEYWORDS`. */
    id: string;
    /** Same as the `titleKey` of the `<Card>`; also the scroll target (`data-search-tile`). */
    titleKey: string;
    /** Text of the tile; defaults to the `.description` sibling of the title key when it exists. */
    descriptionKey?: string;
    /** Labels of the controls inside, so "Allow group chat" finds "Other features". */
    fieldKeys?: string[];
    /** Tabs (or `page:<navKey>`) that show this tile. */
    parents: string[];
    gate?: TileGate;
    /** The source file that renders the `<Card titleKey>`; the drift test greps it. */
    source: string;
    /** Levels the tile belongs to when not derived from the parent. */
    level?: SearchLevel;
}

const tile = (
    id: string,
    titleKey: string,
    parents: string[],
    source: string,
    options: Partial<Pick<RegistryTile, 'descriptionKey' | 'fieldKeys' | 'gate' | 'level'>> = {},
): RegistryTile => ({ id, titleKey, parents, source, ...options });

const PERMISSIONS = ['settings:permissions', 'tenant:global-settings', 'agency:functionalities'];
// The Träger page (`TenantGlobalSettings`) passes `excludeCardKeys={['liveChat']}`: no live-chat card there.
const PERMISSIONS_WITHOUT_LIVE_CHAT = PERMISSIONS.filter((parent) => parent !== 'tenant:global-settings');
const CHAT = 'src/components/Tenants/AppSettings/PermissionsSettings';
const FEATURE_LABELS = [
    'tenants.permissions.feature.videoCalls',
    'tenants.permissions.feature.audioCalls',
    'tenants.permissions.feature.voiceMessages',
    'tenants.permissions.feature.threads',
    'tenants.permissions.feature.supervision',
    'tenants.permissions.feature.mediaUpload',
    'tenants.permissions.feature.mediaInlineDisplay',
    'tenants.permissions.feature.mediaAiScan',
];
const NOTIFICATION_LABELS = [
    'tenants.permissions.card.notifications.askForEmail',
    'tenants.permissions.card.notifications.email',
    'tenants.permissions.card.notifications.browser',
];
// What each card really has (chatTypeCards.ts): live chat only notifies in the browser, the
// conversation circle has no supervision switch, internal group chats have no feature switches.
const WITHOUT_SUPERVISION = FEATURE_LABELS.filter((key) => !key.endsWith('.supervision'));
const BROWSER_NOTIFICATION = ['tenants.permissions.card.notifications.browser'];
const EMAIL_AND_BROWSER_NOTIFICATION = NOTIFICATION_LABELS.slice(1);

export const SEARCH_TILES: RegistryTile[] = [
    // ── Settings › Configuration (platform admin) ────────────────────────────
    tile(
        'global:login-function',
        'tenants.globalSettings.anonymousChat.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/LoginFunctionCard/index.tsx',
        {
            fieldKeys: ['tenants.permissions.anonymousChat.title'],
        },
    ),
    tile(
        'global:one-topic',
        'globalSettings.oneTopicPerAgency.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/OneTopicPerAgencySettingsCard/index.tsx',
        {
            fieldKeys: ['globalSettings.oneTopicPerAgency.switch'],
        },
    ),
    tile(
        'global:support-email',
        'globalSettings.supportEmail.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/SupportEmailSettingsCard/index.tsx',
        {
            fieldKeys: ['globalSettings.supportEmail.label'],
        },
    ),
    tile(
        'global:postcode',
        'globalSettings.furtherCounsellingPostcode.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/FurtherCounsellingPostcodeSettingsCard/index.tsx',
    ),
    tile(
        'global:topic-duplicate',
        'globalSettings.topicDuplicate.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/TopicDuplicateSettingsCard/index.tsx',
    ),
    tile(
        'global:tutorials',
        'globalSettings.tutorials.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/CounsellorTutorialSettingsCard/index.tsx',
        {
            fieldKeys: [
                'globalSettings.tutorials.showTours',
                'globalSettings.tutorials.tours',
                'globalSettings.tutorials.practice',
            ],
        },
    ),
    tile(
        'global:translation',
        'legal.translation.settings.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/TranslationApiKeysCard/index.tsx',
        {
            fieldKeys: ['legal.translation.settings.newKey'],
        },
    ),
    tile(
        'global:inactivity',
        'globalSettings.accountInactivity.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/AccountInactivitySettingsCard/index.tsx',
    ),
    tile(
        'global:guest-accounts',
        'globalSettings.temporaryAccounts.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/TemporaryAccountSettingsCards/index.tsx',
        {
            fieldKeys: [
                'globalSettings.temporaryAccounts.call.title',
                'globalSettings.temporaryAccounts.chat.title',
                'tileHelp.guestAccounts.password.title',
            ],
        },
    ),
    tile(
        'global:guest-messages',
        'globalSettings.temporaryMessages.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/TemporaryAccountSettingsCards/index.tsx',
    ),
    tile(
        'global:chat-recovery',
        'globalSettings.chatRecovery.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/ChatRecoverySettingsCard/index.tsx',
        {
            fieldKeys: [
                'globalSettings.chatRecovery.mode.loginPassword',
                'globalSettings.chatRecovery.mode.recoveryKey',
            ],
        },
    ),
    tile(
        'global:statistics',
        'globalSettings.statistics.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/StatisticsSettingsCard/index.tsx',
        {
            fieldKeys: ['globalSettings.statistics.section.protocol', 'globalSettings.statistics.protocol.download'],
        },
    ),
    tile(
        'global:document-master-data',
        'globalSettings.documentMasterData.title',
        ['settings:global-config'],
        'src/components/GlobalSettings/DocumentMasterDataCard/index.tsx',
        {
            fieldKeys: [
                'globalSettings.documentMasterData.operator.title',
                'globalSettings.documentMasterData.operator.legalName',
                'globalSettings.documentMasterData.operator.dpoName',
                'globalSettings.documentMasterData.supervisoryAuthority.title',
                'globalSettings.documentMasterData.legalFramework',
                'globalSettings.documentMasterData.document.documentDate',
                'globalSettings.documentMasterData.document.nextReviewDate',
                'globalSettings.documentMasterData.keyFigures.title',
            ],
        },
    ),

    // ── Master data (platform, Träger, and a Träger in context) ──────────────
    tile(
        'master:tenant-information',
        'tenants.add.mainTenantTitle',
        ['tenant:general'],
        'src/pages/Tenants/Edit/General/index.tsx',
    ),
    tile(
        'master:name-slogan',
        'organisations.nameAndSlugTitle',
        ['settings:master-data', 'tenant:general'],
        'src/components/Tenants/GeneralSettings/components/NameAndSlogan/index.tsx',
        {
            fieldKeys: ['organisation.name', 'organisation.claim'],
        },
    ),
    tile(
        'master:form-of-address',
        'tenants.typeOfLanguage.title',
        ['settings:master-data', 'tenant:general'],
        'src/components/Tenants/GeneralSettings/components/TypeOfLanguage/index.tsx',
        {
            fieldKeys: ['tenants.typeOfLanguage.radio.formal', 'tenants.typeOfLanguage.radio.informal'],
        },
    ),
    tile(
        'master:editing-rights',
        'settings.masterData.editable.title',
        ['settings:master-data', 'tenant:general'],
        'src/components/Tenants/GeneralSettings/components/EditingRightsCard/index.tsx',
        {
            fieldKeys: ['settings.masterData.editable.toggle'],
        },
    ),

    // ── Appearance ───────────────────────────────────────────────────────────
    tile(
        'appearance:images',
        'settings.images.title',
        ['settings:general', 'tenant:theme-settings'],
        'src/components/Tenants/GeneralSettings/components/LogoAndFavicon/index.tsx',
        {
            fieldKeys: ['organisation.logo', 'organisation.favicon', 'organisation.associationLogo'],
        },
    ),
    tile(
        'appearance:assistant',
        'settings.assistant.title',
        ['settings:general', 'tenant:theme-settings'],
        'src/components/Tenants/GeneralSettings/components/AssistantIdentity/index.tsx',
        {
            fieldKeys: ['settings.assistant.name', 'settings.assistant.icon'],
        },
    ),
    tile(
        'appearance:languages',
        'organisations.language',
        ['settings:general', 'tenant:theme-settings'],
        'src/components/Tenants/GeneralSettings/components/Languages/index.tsx',
    ),
    tile(
        'appearance:colors',
        'settings.colors',
        ['settings:general', 'tenant:theme-settings'],
        'src/components/Tenants/GeneralSettings/components/ThemeBuilder/index.tsx',
        {
            fieldKeys: ['theme.builder.accentDarkColor', 'theme.builder.accentLightColor', 'theme.builder.signalColor'],
        },
    ),

    // ── Legal ────────────────────────────────────────────────────────────────
    tile(
        'legal:settings',
        'tenants.legal.singleTenantsManageLegal.title',
        ['settings:legal', 'tenant:legal-settings'],
        'src/components/Tenants/LegalSettings/components/LegalManagementCard/index.tsx',
        { gate: 'singleDomain' },
    ),
    tile(
        'legal:contracts',
        'tenants.legal.dataProcessingAgreement.title',
        ['settings:legal', 'tenant:legal-settings', 'agency:legal-settings'],
        'src/components/Tenants/LegalSettings/components/DataProcessingAgreementCard/index.tsx',
    ),
    tile(
        'legal:imprint',
        'imprint.title',
        ['settings:legal', 'tenant:legal-settings', 'agency:legal-settings'],
        'src/components/Tenants/LegalSettings/index.tsx',
    ),
    tile(
        'legal:privacy',
        'privacy.title',
        ['settings:legal', 'tenant:legal-settings', 'agency:legal-settings'],
        'src/components/Tenants/LegalSettings/index.tsx',
    ),

    // ── Introduction for advice seekers, e-mail, notices ─────────────────────
    tile(
        'erstantwort:texts',
        'tenants.erstantwort.title',
        ['settings:erstantwort', 'tenant:erstantwort'],
        'src/components/Tenants/AppSettings/ErstantwortSettings/ErstantwortTextsCard/index.tsx',
        {
            fieldKeys: [
                'tenants.erstantwort.deadline.label',
                'tenants.erstantwort.platformText.label',
                'tenants.erstantwort.emergencyNumbers.label',
            ],
        },
    ),
    tile(
        'smtp:server',
        'tenants.appSettings.smtp.title',
        ['settings:smtp', 'tenant:smtp'],
        'src/components/Tenants/AppSettings/SmtpSettings/index.tsx',
        {
            fieldKeys: [
                'tenants.appSettings.smtp.systemEmailToggle.title',
                'tenants.appSettings.smtp.platformMode',
                'tenants.appSettings.smtp.ownMode',
                'tenants.appSettings.smtp.emailThemeColor',
                'tenants.appSettings.smtp.host',
                'tenants.appSettings.smtp.port',
                'tenants.appSettings.smtp.from',
                'tenants.appSettings.smtp.username',
                'tenants.appSettings.smtp.passwordNew',
                'tileHelp.mailPanels.sending',
                'tileHelp.mailPanels.credentials',
            ],
        },
    ),
    tile(
        'smtp:test',
        'tenants.appSettings.smtp.test.title',
        ['settings:smtp', 'tenant:smtp'],
        'src/components/Tenants/AppSettings/SmtpSettings/index.tsx',
        {
            fieldKeys: ['tenants.appSettings.smtp.test.button'],
        },
    ),
    tile(
        'smtp:preview',
        'tenants.appSettings.emailPreview.title',
        ['settings:smtp', 'tenant:smtp'],
        'src/components/EmailPreview/BrandedEmailPreviewView.tsx',
    ),
    tile(
        'notices:draft',
        'serviceNotices.title',
        ['settings:service-notices'],
        'src/pages/TenantSettings/ServiceNotices/index.tsx',
        {
            fieldKeys: [
                'serviceNotices.reference',
                'serviceNotices.date',
                'serviceNotices.statusUrl',
                'serviceNotices.variant',
            ],
        },
    ),
    tile(
        'notices:send',
        'serviceNotices.send.title',
        ['settings:service-notices'],
        'src/pages/TenantSettings/ServiceNotices/ServiceNoticeSend.tsx',
    ),
    tile(
        'notices:preview',
        'serviceNotices.previewTitle',
        ['settings:service-notices'],
        'src/pages/TenantSettings/ServiceNotices/index.tsx',
    ),

    // ── Functionality access (policies per conversation type) ────────────────
    tile(
        'access:case-handover',
        'tenants.permissions.card.caseHandover.title',
        PERMISSIONS,
        `${CHAT}/CaseHandoverCard/CaseHandoverCardView.tsx`,
        {
            fieldKeys: [
                'tenants.permissions.card.caseHandover.enabled',
                'tenants.permissions.card.caseHandover.consentClient',
                'tenants.permissions.card.caseHandover.maxSessionDuration',
                'tenants.permissions.card.caseHandover.consentAdvisor',
            ],
        },
    ),
    tile(
        'access:asker-account',
        'tenants.permissions.asker.title',
        PERMISSIONS,
        `${CHAT}/AskerPermissionsCard/index.tsx`,
        {
            fieldKeys: ['tenants.permissions.asker.displayName.label', 'tenants.permissions.asker.email.label'],
        },
    ),
    tile(
        'access:mail-counselling',
        'tenants.permissions.card.oneOnOne.title',
        PERMISSIONS,
        `${CHAT}/chatTypeCards.ts`,
        {
            fieldKeys: [...FEATURE_LABELS, ...NOTIFICATION_LABELS],
        },
    ),
    tile(
        'access:live-chat',
        'tenants.permissions.card.liveChat.title',
        PERMISSIONS_WITHOUT_LIVE_CHAT,
        `${CHAT}/chatTypeCards.ts`,
        {
            fieldKeys: [...FEATURE_LABELS, ...BROWSER_NOTIFICATION, 'liveChatLinks.title'],
        },
    ),
    tile('access:group', 'tenants.permissions.card.group.title', PERMISSIONS, `${CHAT}/chatTypeCards.ts`, {
        fieldKeys: [...WITHOUT_SUPERVISION, ...NOTIFICATION_LABELS],
    }),
    tile(
        'access:group-internal',
        'tenants.permissions.card.groupInternal.title',
        PERMISSIONS,
        `${CHAT}/chatTypeCards.ts`,
        {
            fieldKeys: EMAIL_AND_BROWSER_NOTIFICATION,
        },
    ),

    // ── Functionalities (Träger) ─────────────────────────────────────────────
    tile(
        'app:communication',
        'tenants.appSettings.communications.title',
        ['settings:app-settings', 'tenant:functionalities'],
        'src/components/Tenants/AppSettings/CommunicationSettings/index.tsx',
        {
            fieldKeys: ['tenants.appSettings.communications.video.title'],
            gate: 'multiTenant',
        },
    ),
    tile(
        'app:other',
        'tenants.appSettings.otherFunctions.title',
        ['settings:app-settings', 'tenant:functionalities'],
        'src/components/Tenants/AppSettings/OtherFunctionsSettings/index.tsx',
        {
            fieldKeys: [
                'tenants.appSettings.otherFunctions.statistics.title',
                'tenants.appSettings.otherFunctions.groupChat.title',
                'teamFunctions.chat.name',
                'tenants.appSettings.otherFunctions.supervision.title',
                'tileHelp.otherFunctions.general.title',
            ],
        },
    ),
    tile(
        'app:topics',
        'tenants.appSettings.topics.title',
        ['settings:app-settings', 'tenant:functionalities'],
        'src/components/Tenants/AppSettings/TopicsSettings/index.tsx',
        {
            gate: 'multiTenant',
        },
    ),

    // ── Beratungsstelle in context ───────────────────────────────────────────
    // One card: the three former cards "General information", "Visibility in registration" and "Counseling
    // service settings" are the sections of the "General" card (`AgencyMasterDataTile`), and that card is
    // the only scroll target. Its section titles and controls stay findable as fields.
    tile(
        'agency:master-data',
        'agency.edit.settings.general.title',
        ['agency:general'],
        'src/pages/Agency/Edit/components/MasterDataTile/index.tsx',
        {
            fieldKeys: [
                'agency.edit.general.general_information',
                'agency.edit.general.address.postcode',
                'agency.edit.general.address.city',
                'agency.edit.general.address.street',
                'agency.edit.general.address.phone',
                'agency.edit.general.address.email',
                'agency.edit.general.address.opening_hours',
                'agency.form.registrationSettings.title',
                'agency.form.registrationSettings.consultants.label',
                'agency.form.registrationSettings.onlineDescription',
                'agency.form.registrationSettings.postCodeTitle',
                'agency.edit.settings.title',
                'teamFunctions.counselling.name',
                'agency.edit.general.more_settings.tenant.title',
                'agency.edit.settings.departments',
                'agency.form.settings.counsellorTopicPermission.title',
                'agency.age',
                'agency.gender',
                'agency.relation',
            ],
        },
    ),
    tile(
        'agency:departments',
        'agency.edit.general.department_details',
        ['agency:general'],
        'src/pages/Agency/Edit/components/DepartmentDetails/index.tsx',
        {
            fieldKeys: [
                'agency.edit.general.department_details.phone_extension',
                'agency.edit.general.department_details.floor_location',
            ],
        },
    ),
    tile(
        'agency:data-controller',
        'agency.edit.settings.legal.responsible.title',
        ['agency:legal-settings'],
        'src/pages/Agency/Edit/components/ResponsibleSettings/index.tsx',
    ),
    tile(
        'agency:dpo',
        'agency.edit.settings.legal.contact.title',
        ['agency:legal-settings'],
        'src/pages/Agency/Edit/components/ContactSettings/index.tsx',
    ),

    // ── My account ───────────────────────────────────────────────────────────
    tile('account:personal', 'profile.privateData.title', ['page:account'], 'src/pages/Profile/PrivateData/index.tsx', {
        gate: 'notTenantAdmin',
        level: 'personal',
    }),
    tile('account:roles', 'profile.roles.title', ['page:account'], 'src/pages/Profile/RolesAndAssignment/index.tsx', {
        fieldKeys: ['profile.roles.heading'],
        level: 'personal',
    }),
    tile(
        'account:self-counsel',
        'grantConsultantIdentity.self.title',
        ['page:account'],
        'src/pages/Profile/SelfConsultantIdentity/index.tsx',
        { gate: 'selfCounsel', level: 'personal' },
    ),
    tile(
        'account:password',
        'profile.passwordChange.title',
        ['page:account'],
        'src/pages/Profile/PassswordChange/index.tsx',
        {
            fieldKeys: ['profile.passwordChange.form.currentPassword', 'profile.passwordChange.form.newPassword'],
            level: 'personal',
        },
    ),
    tile('account:two-factor', 'twoFactorAuth.title', ['page:account'], 'src/pages/Profile/TwoFactorCard.tsx', {
        level: 'personal',
    }),
    tile('account:language', 'language.title', ['page:account'], 'src/pages/Profile/LanguageSettings/index.tsx', {
        level: 'personal',
    }),
    tile('account:absence', 'profile.absence.title', ['page:account'], 'src/pages/Profile/Absence/index.tsx', {
        fieldKeys: ['profile.absence.toggle', 'profile.absence.substitute'],
        level: 'personal',
    }),
    tile(
        'account:tours',
        'productTour.overview.title',
        ['page:account'],
        'src/components/productTour/TourOverviewSection.tsx',
        { level: 'personal' },
    ),
    tile(
        'account:documentation',
        'profile.documentation.title',
        ['page:account'],
        'src/pages/Profile/Documentation/index.tsx',
        { level: 'personal', gate: 'documentation' },
    ),
];

/** Tabs of a Träger or Beratungsstelle that is open right now. */
export interface EntityTab {
    id: string;
    titleKey: string;
    path: string;
}

export const TENANT_TABS: EntityTab[] = [
    { id: 'tenant:general', titleKey: 'settings.subhead.masterData', path: 'general' },
    { id: 'tenant:theme-settings', titleKey: 'tenants.edit.tabs.themeSettings', path: 'theme-settings' },
    { id: 'tenant:legal-settings', titleKey: 'tenants.edit.tabs.legal', path: 'legal-settings' },
    { id: 'tenant:erstantwort', titleKey: 'settings.subhead.erstantwort', path: 'erstantwort' },
    { id: 'tenant:smtp', titleKey: 'settings.subhead.smtp', path: 'smtp' },
    { id: 'tenant:global-settings', titleKey: 'settings.subhead.functionAccess', path: 'global-settings' },
    { id: 'tenant:functionalities', titleKey: 'tenants.edit.tabs.appSettings', path: 'functionalities' },
];

export const AGENCY_TABS: EntityTab[] = [
    { id: 'agency:general', titleKey: 'settings.subhead.masterData', path: 'general' },
    { id: 'agency:legal-settings', titleKey: 'settings.subhead.legal', path: 'legal-settings' },
    { id: 'agency:functionalities', titleKey: 'settings.subhead.functionAccess', path: 'functionalities' },
];

/** Sidebar title per nav key (the same keys the mobile menu uses). */
export const NAV_TITLE_KEYS: Record<string, string> = {
    home: 'sidebar.home',
    theme: 'sidebar.settings',
    tenants: 'sidebar.tenants',
    agency: 'sidebar.agency',
    counselors: 'sidebar.users',
    statistics: 'sidebar.statistics',
    links: 'sidebar.links',
    logs: 'sidebar.logs',
    account: 'sidebar.account',
};

/** Which nav section a sub tab id belongs to. */
export const NAV_KEY_OF_SUB_PREFIX: Record<string, string> = {
    settings: 'theme',
    users: 'counselors',
    links: 'links',
    logs: 'logs',
};

export interface RegistryPage {
    id: string;
    titleKey: string;
    descriptionKey?: string;
    /** Nav item the page needs, or a custom gate. */
    navKey?: string;
    to: (context: SearchContext) => string | undefined;
    gate?: (context: SearchContext) => boolean;
    level?: SearchLevel;
}

/** Pages that have no sidebar entry of their own, or are actions ("found a Beratungsstelle"). */
export const EXTRA_PAGES: RegistryPage[] = [
    {
        id: 'page:topics',
        titleKey: 'topics.title',
        descriptionKey: 'topics.title.text',
        // The page has no menu entry; this is what makes it reachable without typing the URL.
        to: () => routePathNames.topics,
        gate: (context) => context.can(PermissionAction.Read, Resource.Topic),
        level: 'platform',
    },
    {
        id: 'page:found-agency',
        titleKey: 'adminSearch.page.foundAgency',
        to: () => routePathNames.agencyAdd,
        gate: (context) => !!context.navTo.agency && context.can(PermissionAction.Create, Resource.Agency),
        level: 'agency',
    },
    {
        id: 'page:found-tenant',
        titleKey: 'adminSearch.page.foundTenant',
        to: (context) => context.subTo['links:tenants'],
        gate: (context) => context.isSuperAdmin && !!context.subTo['links:tenants'],
        level: 'tenant',
    },
];
