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
    settings: {
        activeLanguages?: string[];
        featureAppointmentsEnabled?: boolean | null;
        featureDemographicsEnabled?: boolean | null;
        featureTopicsEnabled?: boolean | null;
        topicsInRegistrationEnabled?: boolean | null;
        featureStatisticsEnabled?: boolean;
        featureGroupChatV2Enabled?: boolean;
        featureCentralDataProtectionTemplateEnabled?: boolean;
    };
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
