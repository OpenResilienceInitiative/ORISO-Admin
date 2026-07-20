export interface CaseHandoverReasonPolicy {
    code: string;
    label: string;
    clientConsentRequired: boolean;
    accessAllowed: boolean;
    enabled: boolean;
    displayOrder: number;
    policyAuthority?: string | null;
    /** Client-facing system-notification templates per language ({{newAdvisor}} placeholder). */
    clientNotificationTemplates?: Partial<Record<'de' | 'en' | 'tr' | 'uk', string>> | null;
}
