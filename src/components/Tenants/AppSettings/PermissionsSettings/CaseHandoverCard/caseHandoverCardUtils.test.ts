import { describe, expect, it } from 'vitest';
import {
    applyClientConsent,
    applyClientConsentPolicy,
    applyModuleEnabled,
    buildDisplayReasons,
    isAdvisorConsentImplicit,
    isHandoverModuleEnabled,
    LEGAL_VIOLATION_PLACEHOLDER_CODE,
    NOTIFICATION_LANGUAGES,
    sortPoliciesByDisplayOrder,
    applyNotificationTemplate,
    getNotificationTemplate,
    resolvedClientConsentPolicy,
} from './caseHandoverCardUtils';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';

const policy = (overrides: Partial<CaseHandoverReasonPolicy>): CaseHandoverReasonPolicy => ({
    code: 'COUNSELLOR_IS_ILL',
    label: 'Counsellor is ill',
    clientConsentRequired: false,
    accessAllowed: true,
    enabled: true,
    displayOrder: 10,
    policyAuthority: null,
    ...overrides,
});

describe('caseHandoverCardUtils', () => {
    it('sorts policies by displayOrder, unknown order last', () => {
        const sorted = sortPoliciesByDisplayOrder([
            policy({ code: 'B', displayOrder: 20 }),
            policy({ code: 'C', displayOrder: undefined as unknown as number }),
            policy({ code: 'A', displayOrder: 10 }),
        ]);
        expect(sorted.map((p) => p.code)).toEqual(['A', 'B', 'C']);
    });

    it('module counts as enabled while any reason is enabled', () => {
        expect(isHandoverModuleEnabled([policy({ enabled: false }), policy({ code: 'X', enabled: true })])).toBe(true);
        expect(isHandoverModuleEnabled([policy({ enabled: false })])).toBe(false);
        expect(isHandoverModuleEnabled([])).toBe(false);
    });

    it('master toggle writes enabled on every reason', () => {
        const result = applyModuleEnabled([policy({ enabled: true }), policy({ code: 'X', enabled: false })], false);
        expect(result.every((p) => p.enabled === false)).toBe(true);
    });

    it('client-consent change only touches the addressed reason', () => {
        const result = applyClientConsent([policy({ code: 'A' }), policy({ code: 'B' })], 'B', true);
        expect(result.find((p) => p.code === 'A')?.clientConsentRequired).toBe(false);
        expect(result.find((p) => p.code === 'B')?.clientConsentRequired).toBe(true);
    });

    it('maps legacy boolean consent to the canonical three-value policy and writes both during transition', () => {
        expect(resolvedClientConsentPolicy(policy({ clientConsentRequired: true }))).toEqual({
            value: 'OPT_IN',
            mode: 'SUGGESTED',
        });
        expect(resolvedClientConsentPolicy(policy({ clientConsentRequired: false }))).toEqual({
            value: 'NONE',
            mode: 'SUGGESTED',
        });

        const result = applyClientConsentPolicy([policy({ code: 'A' }), policy({ code: 'B' })], 'B', {
            value: 'OPT_OUT',
            mode: 'ENFORCED',
        });
        expect(result[0].clientConsent).toBeUndefined();
        expect(result[1]).toEqual(
            expect.objectContaining({
                clientConsent: { value: 'OPT_OUT', mode: 'ENFORCED' },
                clientConsentRequired: false,
            }),
        );
    });

    it('appends the legal-violation placeholder tab unless the backend seeds it', () => {
        const reasons = buildDisplayReasons([policy({ code: 'A', displayOrder: 10 })]);
        expect(reasons.map((r) => r.code)).toEqual(['A', LEGAL_VIOLATION_PLACEHOLDER_CODE]);
        expect(reasons[1].isPlaceholder).toBe(true);
        expect(reasons[1].policy).toBeNull();

        const seeded = buildDisplayReasons([policy({ code: LEGAL_VIOLATION_PLACEHOLDER_CODE, displayOrder: 60 })]);
        expect(seeded).toHaveLength(1);
        expect(seeded[0].isPlaceholder).toBe(false);
    });

    it('keeps legacy emergency data out of the current visible reason catalogue', () => {
        const reasons = buildDisplayReasons([
            policy({ code: 'COUNSELLOR_ASKED_FOR_ADVICE', displayOrder: 10 }),
            policy({ code: 'OTHER_EMERGENCY', displayOrder: 20 }),
            policy({ code: 'COUNSELLOR_IS_ILL', displayOrder: 30 }),
        ]);

        expect(reasons.map((reason) => reason.code)).not.toContain('OTHER_EMERGENCY');
        expect(reasons.map((reason) => reason.code)).toContain('COUNSELLOR_IS_ILL');
    });

    it('advisor consent is implicit only for advice requests', () => {
        expect(isAdvisorConsentImplicit('COUNSELLOR_ASKED_FOR_ADVICE')).toBe(true);
        expect(isAdvisorConsentImplicit('COUNSELLOR_IS_ILL')).toBe(false);
    });

    it('uses only stored backend templates and leaves missing translations empty', () => {
        const stored = policy({
            code: 'COUNSELLOR_IS_ILL',
            clientNotificationTemplates: { de: 'Eigener Text mit {{newAdvisor}}.' },
        });
        expect(getNotificationTemplate(stored, 'de')).toEqual('Eigener Text mit {{newAdvisor}}.');
        expect(getNotificationTemplate(stored, 'en')).toEqual('');
        expect(getNotificationTemplate(null, 'de')).toEqual('');
    });

    it('writes, trims and clears per-language templates on the matching reason only', () => {
        const policies = [policy({ code: 'A' }), policy({ code: 'B' })];
        const written = applyNotificationTemplate(policies, 'A', 'de', '  Neuer Text  ');
        expect(written[0].clientNotificationTemplates).toEqual({ de: 'Neuer Text' });
        expect(written[1].clientNotificationTemplates).toBeUndefined();

        const cleared = applyNotificationTemplate(written, 'A', 'de', '   ');
        expect(cleared[0].clientNotificationTemplates).toBeNull();
    });

    it('uses the complete canonical language registry', () => {
        expect(NOTIFICATION_LANGUAGES).toEqual(['de', 'en', 'fr', 'ru', 'tr', 'uk', 'ti']);
    });
});
