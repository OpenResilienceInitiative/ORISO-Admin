import type { SupportedLanguageCode } from '../constants/supportedLanguages';
import type { CaseHandoverConsentPolicy, CaseHandoverConsentValue, PermissionPolicyMode } from './permissionPolicy';

export interface CaseHandoverReasonPolicy {
    code: string;
    label: string;
    clientConsentRequired: boolean;
    /**
     * Canonical reason-specific consent policy. Written as the typed policy object; the
     * UserService answers the bare value and carries the mode in `clientConsentMode`, so both
     * shapes reach this card — always read it through `resolvedClientConsentPolicy`.
     */
    clientConsent?: CaseHandoverConsentPolicy | CaseHandoverConsentValue;
    /** Mode belonging to a bare `clientConsent` value, as the UserService returns it. */
    clientConsentMode?: PermissionPolicyMode | null;
    accessAllowed: boolean;
    enabled: boolean;
    displayOrder: number;
    policyAuthority?: string | null;
    /** Required for advice/co-access; omitted for takeover reasons that have no TTL. */
    maxAccessDurationMinutes?: number | null;
    /** Client-facing system-notification templates per language ({{newAdvisor}} placeholder). */
    clientNotificationTemplates?: Partial<Record<SupportedLanguageCode, string>> | null;
}
