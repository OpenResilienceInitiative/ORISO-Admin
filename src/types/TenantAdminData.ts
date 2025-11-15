import { BasicTenantData } from './tenant';

export interface TenantAdminData extends BasicTenantData {
    adminEmails: string[];
    theming: {
        associationLogo?: string;
        logo?: string;
        favicon?: string;
        primaryColor?: string;
        secondaryColor?: string | null;
    };
    content: {
        impressum: Record<string, string>;
        privacy: Record<string, string>;
        termsAndConditions: Record<string, string>;
        claim: Record<string, string>;
        confirmTermsAndConditions: boolean;
        confirmPrivacy: boolean;
    };
    settings: BasicTenantData['settings'] & {
        extendedSettings?: TenantAdminSettings;
    };
}

interface TenantAdminSettings {
    isVideoCallAllowed: boolean;
    languageFormal: boolean;
    sendFurtherStepsMessage: boolean;
    sendSaveSessionDataMessage: boolean;
    notifications: {
        teamSessions: {
            newMessage: {
                allTeamConsultants: boolean;
            };
        };
    };
    welcomeMessage: {
        sendWelcomeMessage: boolean;
        welcomeMessageText: string;
    };
}
