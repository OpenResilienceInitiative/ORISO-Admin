export interface TenantSettings {
    activeLanguages?: string[];
    featureAppointmentsEnabled?: boolean | null;
    featureDemographicsEnabled?: boolean | null;
    featureTopicsEnabled?: boolean | null;
    topicsInRegistrationEnabled?: boolean | null;
    featureStatisticsEnabled?: boolean | null;
    featureGroupChatV2Enabled?: boolean | null;
    featureTeamDiscussionEnabled?: boolean | null;
    featureCentralDataProtectionTemplateEnabled?: boolean | null;
    featureAnonymousChatEnabled?: boolean | null;
    /** Whether advice seekers may type a display name (vs re-roll only). See ORISO-Admin#602. */
    featureDisplayNameEditable?: boolean | null;
    /** Whether advice seekers may leave an e-mail address. See ORISO-Admin#602. */
    featureAskerEmailEnabled?: boolean | null;
    featureCallsEnabled?: boolean | null;
    featureSupervisionEnabled?: boolean | null;
    featureSupervisionAnonymousChatsEnabled?: boolean | null;
    featureSupervisionOneOnOneChatsEnabled?: boolean | null;
    featureAudioCallsEnabled?: boolean | null;
    featureAudioCallsAnonymousChatsEnabled?: boolean | null;
    featureAudioCallsOneOnOneChatsEnabled?: boolean | null;
    featureAudioCallsGroupChatsEnabled?: boolean | null;
    featureAudioCallsSupervisionChatsEnabled?: boolean | null;
    featureVideoCallsEnabled?: boolean | null;
    featureVideoCallsAnonymousChatsEnabled?: boolean | null;
    featureVideoCallsOneOnOneChatsEnabled?: boolean | null;
    featureVideoCallsGroupChatsEnabled?: boolean | null;
    featureVideoCallsSupervisionChatsEnabled?: boolean | null;
    featureThreadsEnabled?: boolean | null;
    featureThreadsAnonymousChatsEnabled?: boolean | null;
    featureThreadsGroupChatsEnabled?: boolean | null;
    featureThreadsOneOnOneEnabled?: boolean | null;
    featureThreadsSupervisionChatsEnabled?: boolean | null;
    featureVoiceMessagesEnabled?: boolean | null;
    featureVoiceMessagesAnonymousChatsEnabled?: boolean | null;
    featureVoiceMessagesOneOnOneChatsEnabled?: boolean | null;
    featureVoiceMessagesGroupChatsEnabled?: boolean | null;
    featureVoiceMessagesSupervisionChatsEnabled?: boolean | null;
    featureMediaUploadEnabled?: boolean | null;
    featureMediaUploadAnonymousChatsEnabled?: boolean | null;
    featureMediaUploadOneOnOneChatsEnabled?: boolean | null;
    featureMediaUploadGroupChatsEnabled?: boolean | null;
    featureMediaUploadSupervisionChatsEnabled?: boolean | null;
    featureMediaInlineDisplayEnabled?: boolean | null;
    featureMediaInlineDisplayAnonymousChatsEnabled?: boolean | null;
    featureMediaInlineDisplayOneOnOneChatsEnabled?: boolean | null;
    featureMediaInlineDisplayGroupChatsEnabled?: boolean | null;
    featureMediaInlineDisplaySupervisionChatsEnabled?: boolean | null;
    featureMediaAiScanEnabled?: boolean | null;
    featureMediaAiScanAnonymousChatsEnabled?: boolean | null;
    featureMediaAiScanOneOnOneChatsEnabled?: boolean | null;
    featureMediaAiScanGroupChatsEnabled?: boolean | null;
    featureMediaAiScanSupervisionChatsEnabled?: boolean | null;
    featureSystemNotificationEmailsEnabled?: boolean | null;
    smtp?: {
        enabled?: boolean | null;
        host?: string | null;
        port?: number | null;
        secure?: boolean | null;
        username?: string | null;
        password?: string | null;
        from?: string | null;
        emailThemeColor?: string | null;
    };
    tenantAdminControls?: {
        permissionsPageEnabled?: boolean | null;
        allowedPermissionToggles?: TenantAdminPermissionToggles;
        /** Per-feature flags an upper role locks on for lower roles (enforced-on). See ADR-013. */
        enforcedPermissionToggles?: TenantAdminPermissionToggles;
    };
}

interface TenantAdminPermissionToggles {
    anonymousChat?: boolean | null;
    groupChat?: boolean | null;
    appearance?: boolean | null;
    displayNameEditable?: boolean | null;
    askerEmail?: boolean | null;
    calls?: boolean | null;
    supervision?: boolean | null;
    supervisionAnonymousChats?: boolean | null;
    supervisionOneOnOneChats?: boolean | null;
    audioCalls?: boolean | null;
    audioCallsAnonymousChats?: boolean | null;
    audioCallsOneOnOneChats?: boolean | null;
    audioCallsGroupChats?: boolean | null;
    audioCallsSupervisionChats?: boolean | null;
    videoCalls?: boolean | null;
    videoCallsAnonymousChats?: boolean | null;
    videoCallsOneOnOneChats?: boolean | null;
    videoCallsGroupChats?: boolean | null;
    videoCallsSupervisionChats?: boolean | null;
    threads?: boolean | null;
    threadsAnonymousChats?: boolean | null;
    threadsOneOnOneChats?: boolean | null;
    threadsGroupChats?: boolean | null;
    threadsSupervisionChats?: boolean | null;
    voiceMessages?: boolean | null;
    voiceMessagesAnonymousChats?: boolean | null;
    voiceMessagesOneOnOneChats?: boolean | null;
    voiceMessagesGroupChats?: boolean | null;
    voiceMessagesSupervisionChats?: boolean | null;
}

export interface BasicTenantData {
    id: number | null;
    key?: number | null;
    name: string;
    beraterCount?: number;
    subdomain?: string;
    /** Optional postal address of the tenant (NEW shared API field). */
    address?: string;
    /** Optional free-text description of the tenant (NEW shared API field). */
    description?: string;
    createDate?: string;
    startServiceDate?: string; // to-do: show startServiceDate instead of createDate
    updateDate?: string;
    isSuperAdmin: boolean;
    userRoles: string[];
    licensing?: {
        allowedNumberOfUsers: number | 0;
        videoFeature?: boolean;
    };
    consultingType?: string; // to-do: define what other consulting types are available besides Beratung
    twoFactorAuth?: boolean; // to-do: toggeable for different usertypes (consultants and advice seekers)
    formalLanguage?: boolean;
    settings: TenantSettings;
}

export interface TenantData extends BasicTenantData {
    theming: {
        logo: string;
        favicon: string;
        associationLogo?: string;
        primaryColor: string;
        secondaryColor: string | null;
        accent?: string | null;
        signal?: string | null;
    };
    content: {
        impressum: string | null;
        privacy: string | null;
        termsAndConditions: string | null;
        claim: string;
    };
}
