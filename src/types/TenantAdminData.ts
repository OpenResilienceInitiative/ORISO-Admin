import { BasicTenantData } from './tenant';

export interface TenantAdminData extends BasicTenantData {
    // address?: string; description?: string; are inherited from BasicTenantData (NEW shared API fields).
    adminEmails: string[];
    theming: {
        associationLogo?: string;
        logo?: string;
        favicon?: string;
        primaryColor?: string;
        secondaryColor?: string | null;
        accent?: string | null;
        signal?: string | null;
    };
    content: {
        impressum: Record<string, string>;
        privacy: Record<string, string>;
        /**
         * The consent sentence belonging to `privacy` (ADR-021 decision 4 — a field
         * of the data-protection policy, not a document of its own), as a
         * language → sentence map.
         *
         * TODO(#250): TenantService counterpart of the AgencyService field built on
         * branch `feat/legal-text-versioning-250`. `undefined` = the deployed
         * backend does not know it yet, and the Admin hides the consent editor.
         */
        privacyConsent?: Record<string, string>;
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
