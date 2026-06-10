import { BasicTenantData } from './tenant';

export interface TenantAdminData extends BasicTenantData {
    adminEmails: string[];
    theming: {
        associationLogo?: string;
        logo?: string;
        favicon?: string;
        /** Main brand seed; the palette is computed from it on use. */
        primaryColor?: string;
        /** Legacy mirrored value — computed, not stored; cleared on save. */
        secondaryColor?: string | null;
        /** Optional accent seed, harmonised toward the primary. */
        accent?: string | null;
        /** Optional signal/error seed; Oriso default tones when unset. */
        signal?: string | null;
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
