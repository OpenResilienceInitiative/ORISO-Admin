import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import { SUPPORTED_LANGUAGE_CODES, type SupportedLanguageCode } from '../../../../../constants/supportedLanguages';

export type NotificationLanguage = SupportedLanguageCode;

export const NOTIFICATION_LANGUAGES: readonly NotificationLanguage[] = SUPPORTED_LANGUAGE_CODES;

/** Reasons where the previous counsellor is absent — their consent is structurally
 *  excluded (they cannot be asked), per CONTEXT.md "Approval role (consent axis)". */
const ADVISOR_ABSENT_REASON_CODES = new Set([
    'COUNSELLOR_ON_HOLIDAY',
    'COUNSELLOR_IS_ILL',
    'COUNSELLOR_LEFT',
    'OTHER_EMERGENCY',
]);

/** Advisor consent is implicit when the advisor initiates the request themselves. */
const ADVISOR_IMPLICIT_CONSENT_CODES = new Set(['COUNSELLOR_ASKED_FOR_ADVICE']);

export const isAdvisorConsentImplicit = (code: string) => ADVISOR_IMPLICIT_CONSENT_CODES.has(code);

export const isAdvisorAbsentReason = (code: string) => ADVISOR_ABSENT_REASON_CODES.has(code);

export const sortPoliciesByDisplayOrder = (policies: CaseHandoverReasonPolicy[]) =>
    [...policies].sort((a, b) => (a.displayOrder ?? 100) - (b.displayOrder ?? 100));

/** "Rechtsverletzung": shown as a disabled placeholder tab until the reason is
 *  seeded in the backend — a responsible authority (e.g. the organisation's
 *  legal counsel) can be assigned to it later (Frank, 2026-07-06). */
export const LEGAL_VIOLATION_PLACEHOLDER_CODE = 'LEGAL_VIOLATION';

export type DisplayReason = {
    code: string;
    policy: CaseHandoverReasonPolicy | null;
    isPlaceholder: boolean;
};

/** Tabs to render: all backend reasons in display order, plus the legal-violation
 *  placeholder as long as the backend does not seed it itself. */
export const buildDisplayReasons = (policies: CaseHandoverReasonPolicy[]): DisplayReason[] => {
    const sorted = sortPoliciesByDisplayOrder(policies);
    const reasons: DisplayReason[] = sorted.map((policy) => ({
        code: policy.code,
        policy,
        isPlaceholder: false,
    }));
    if (!sorted.some((policy) => policy.code === LEGAL_VIOLATION_PLACEHOLDER_CODE)) {
        reasons.push({ code: LEGAL_VIOLATION_PLACEHOLDER_CODE, policy: null, isPlaceholder: true });
    }
    return reasons;
};

/** Master "Aktiviert": the module counts as on while any reason is enabled. */
export const isHandoverModuleEnabled = (policies: CaseHandoverReasonPolicy[]) =>
    policies.some((policy) => policy.enabled);

/** Master toggle writes `enabled` on every reason — module off = no handover possible. */
export const applyModuleEnabled = (policies: CaseHandoverReasonPolicy[], enabled: boolean) =>
    policies.map((policy) => ({ ...policy, enabled }));

export const applyClientConsent = (
    policies: CaseHandoverReasonPolicy[],
    code: string,
    clientConsentRequired: boolean,
) => policies.map((policy) => (policy.code === code ? { ...policy, clientConsentRequired } : policy));

export const applyMaxAccessDuration = (
    policies: CaseHandoverReasonPolicy[],
    code: string,
    maxAccessDurationMinutes: number,
) =>
    policies.map((policy) =>
        policy.code === code ? { ...policy, maxAccessDurationMinutes: Math.max(15, maxAccessDurationMinutes) } : policy,
    );

/** Effective template: only backend-stored copy is rendered in production. */
export const getNotificationTemplate = (policy: CaseHandoverReasonPolicy | null, language: NotificationLanguage) =>
    policy?.clientNotificationTemplates?.[language] ?? '';

/** Writes one language's template on the given reason; blank text clears the override. */
export const applyNotificationTemplate = (
    policies: CaseHandoverReasonPolicy[],
    code: string,
    language: NotificationLanguage,
    text: string,
) =>
    policies.map((policy) => {
        if (policy.code !== code) {
            return policy;
        }
        const templates = { ...(policy.clientNotificationTemplates ?? {}) };
        const trimmed = text.trim();
        if (trimmed) {
            templates[language] = trimmed;
        } else {
            delete templates[language];
        }
        return {
            ...policy,
            clientNotificationTemplates: Object.keys(templates).length ? templates : null,
        };
    });
