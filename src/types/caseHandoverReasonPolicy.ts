import type { SupportedLanguageCode } from '../constants/supportedLanguages';
import type { CaseHandoverConsentPolicy } from './permissionPolicy';

export interface CaseHandoverReasonPolicy {
    code: string;
    label: string;
    clientConsentRequired: boolean;
    /** Canonical reason-specific consent policy; boolean remains transition-read compatible. */
    clientConsent?: CaseHandoverConsentPolicy;
    accessAllowed: boolean;
    enabled: boolean;
    displayOrder: number;
    policyAuthority?: string | null;
    /** Required for advice/co-access; omitted for takeover reasons that have no TTL. */
    maxAccessDurationMinutes?: number | null;
    /** Client-facing system-notification templates per language ({{newAdvisor}} placeholder). */
    clientNotificationTemplates?: Partial<Record<SupportedLanguageCode, string>> | null;
}
