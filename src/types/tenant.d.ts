export interface TenantSettings {
    activeLanguages?: string[];
    featureAppointmentsEnabled?: boolean | null;
    featureDemographicsEnabled?: boolean | null;
    featureTopicsEnabled?: boolean | null;
    topicsInRegistrationEnabled?: boolean | null;
    featureStatisticsEnabled?: boolean | null;
    featureGroupChatV2Enabled?: boolean | null;
    featureCentralDataProtectionTemplateEnabled?: boolean | null;
    featureAnonymousChatEnabled?: boolean | null;
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
    featureSystemNotificationEmailsEnabled?: boolean | null;
    smtp?: {
        enabled?: boolean | null;
        host?: string | null;
        port?: number | null;
        secure?: boolean | null;
        username?: string | null;
        password?: string | null;
        from?: string | null;
    };
}

export interface BasicTenantData {
    id: number | null;
    key?: number | null;
    name: string;
    subdomain?: string;
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
        primaryColor: string;
        secondaryColor: string | null;
    };
    content: {
        impressum: string | null;
        privacy: string | null;
        termsAndConditions: string | null;
        claim: string;
    };
}

        secondaryColor: string | null;
    };
    content: {
        impressum: string | null;
        privacy: string | null;
        termsAndConditions: string | null;
        claim: string;
    };
}

        secondaryColor: string | null;
    };
    content: {
        impressum: string | null;
        privacy: string | null;
        termsAndConditions: string | null;
        claim: string;
    };
}

        secondaryColor: string | null;
    };
    content: {
        impressum: string | null;
        privacy: string | null;
        termsAndConditions: string | null;
        claim: string;
    };
}

        secondaryColor: string | null;
    };
    content: {
        impressum: string | null;
        privacy: string | null;
        termsAndConditions: string | null;
        claim: string;
    };
}

        secondaryColor: string | null;
    };
    content: {
        impressum: string | null;
        privacy: string | null;
        termsAndConditions: string | null;
        claim: string;
    };
}
