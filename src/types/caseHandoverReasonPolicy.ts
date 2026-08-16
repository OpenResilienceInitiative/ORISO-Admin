export interface CaseHandoverReasonPolicy {
    code: string;
    label: string;
    clientConsentRequired: boolean;
    accessAllowed: boolean;
    enabled: boolean;
    displayOrder: number;
    policyAuthority?: string | null;
    /** Required for advice/co-access; omitted for takeover reasons that have no TTL. */
    maxAccessDurationMinutes?: number | null;
    /** Client-facing system-notification templates per language ({{newAdvisor}} placeholder). */
    clientNotificationTemplates?: Partial<Record<'de' | 'en' | 'tr' | 'uk', string>> | null;
}
