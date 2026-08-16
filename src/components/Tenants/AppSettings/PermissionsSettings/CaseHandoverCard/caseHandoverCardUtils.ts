import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';

export type NotificationLanguage = 'de' | 'en' | 'tr' | 'uk';

export const NOTIFICATION_LANGUAGES: NotificationLanguage[] = ['de', 'en', 'tr', 'uk'];

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

/** Sample system-notification templates per reason and client language.
 *  Display-only until the backend stores real templates (multilingual template
 *  storage is a planned follow-up; see epic task "System-Nachrichten-Template"). */
export const NOTIFICATION_TEMPLATE_SAMPLES: Record<string, Partial<Record<NotificationLanguage, string>>> = {
    COUNSELLOR_IS_ILL: {
        de: 'Die vorherige Berater*in ist leider krank. Deshalb wurde dein Fall an {neue Berater*in} übergeben.',
        en: 'The previous advisor is unfortunately ill. Therefore, your case has been handed over to {new advisor}.',
        tr: 'Önceki danışmanınız maalesef hasta. Bu nedenle vakanız {yeni danışman} adlı danışmana devredildi.',
        uk: 'На жаль, попередній консультант захворів. Тому вашу справу передано {новий консультант}.',
    },
    COUNSELLOR_ON_HOLIDAY: {
        de: 'Die vorherige Berater*in ist im Urlaub. Deshalb wurde dein Fall an {neue Berater*in} übergeben.',
        en: 'The previous advisor is on holiday. Therefore, your case has been handed over to {new advisor}.',
        tr: 'Önceki danışmanınız izinde. Bu nedenle vakanız {yeni danışman} adlı danışmana devredildi.',
        uk: 'Попередній консультант у відпустці. Тому вашу справу передано {новий консультант}.',
    },
    COUNSELLOR_ASKED_FOR_ADVICE: {
        de: 'Deine Berater*in hat eine Kolleg*in um fachlichen Rat gebeten. {Berater*in} kann den Verlauf vorübergehend einsehen.',
        en: 'Your advisor has asked a colleague for professional advice. {advisor} can temporarily view the conversation.',
        tr: 'Danışmanınız bir meslektaşından uzman görüşü istedi. {danışman} görüşmeyi geçici olarak görüntüleyebilir.',
        uk: 'Ваш консультант звернувся до колеги за фаховою порадою. {консультант} може тимчасово переглядати розмову.',
    },
    COUNSELLOR_LEFT: {
        de: 'Die vorherige Berater*in ist nicht mehr für uns tätig. Deshalb wurde dein Fall an {neue Berater*in} übergeben.',
        en: 'The previous advisor no longer works here. Therefore, your case has been handed over to {new advisor}.',
        tr: 'Önceki danışmanınız artık bizimle çalışmıyor. Bu nedenle vakanız {yeni danışman} adlı danışmana devredildi.',
        uk: 'Попередній консультант більше не працює в нас. Тому вашу справу передано {новий консультант}.',
    },
    OTHER_EMERGENCY: {
        de: 'Aufgrund eines Notfalls wurde dein Fall an {neue Berater*in} übergeben.',
        en: 'Due to an emergency, your case has been handed over to {new advisor}.',
        tr: 'Acil bir durum nedeniyle vakanız {yeni danışman} adlı danışmana devredildi.',
        uk: 'Через надзвичайну ситуацію вашу справу передано {новий консультант}.',
    },
    LEGAL_VIOLATION: {
        de: 'Aus rechtlichen Gründen wurde dein Fall an {neue Berater*in} übergeben.',
        en: 'For legal reasons, your case has been handed over to {new advisor}.',
        tr: 'Yasal nedenlerle vakanız {yeni danışman} adlı danışmana devredildi.',
        uk: 'З юридичних причин вашу справу передано {новий консультант}.',
    },
};

export const getNotificationTemplateSample = (code: string, language: NotificationLanguage) =>
    NOTIFICATION_TEMPLATE_SAMPLES[code]?.[language] ?? '';

/** Effective template: backend-stored value first, sample copy as fallback. */
export const getNotificationTemplate = (
    policy: CaseHandoverReasonPolicy | null,
    code: string,
    language: NotificationLanguage,
) => policy?.clientNotificationTemplates?.[language] ?? getNotificationTemplateSample(code, language);

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
