import { describe, expect, it } from 'vitest';
import {
    applyClientConsent,
    applyModuleEnabled,
    buildDisplayReasons,
    getNotificationTemplateSample,
    isAdvisorConsentImplicit,
    isHandoverModuleEnabled,
    LEGAL_VIOLATION_PLACEHOLDER_CODE,
    NOTIFICATION_LANGUAGES,
    NOTIFICATION_TEMPLATE_SAMPLES,
    sortPoliciesByDisplayOrder,
    applyNotificationTemplate,
    getNotificationTemplate,
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

    it('appends the legal-violation placeholder tab unless the backend seeds it', () => {
        const reasons = buildDisplayReasons([policy({ code: 'A', displayOrder: 10 })]);
        expect(reasons.map((r) => r.code)).toEqual(['A', LEGAL_VIOLATION_PLACEHOLDER_CODE]);
        expect(reasons[1].isPlaceholder).toBe(true);
        expect(reasons[1].policy).toBeNull();

        const seeded = buildDisplayReasons([policy({ code: LEGAL_VIOLATION_PLACEHOLDER_CODE, displayOrder: 60 })]);
        expect(seeded).toHaveLength(1);
        expect(seeded[0].isPlaceholder).toBe(false);
    });

    it('advisor consent is implicit only for advice requests', () => {
        expect(isAdvisorConsentImplicit('COUNSELLOR_ASKED_FOR_ADVICE')).toBe(true);
        expect(isAdvisorConsentImplicit('COUNSELLOR_IS_ILL')).toBe(false);
    });

    it('prefers the stored backend template over the sample', () => {
        const stored = policy({
            code: 'COUNSELLOR_IS_ILL',
            clientNotificationTemplates: { de: 'Eigener Text mit {{newAdvisor}}.' },
        });
        expect(getNotificationTemplate(stored, 'COUNSELLOR_IS_ILL', 'de')).toEqual('Eigener Text mit {{newAdvisor}}.');
        // missing language falls back to the sample copy
        expect(getNotificationTemplate(stored, 'COUNSELLOR_IS_ILL', 'en')).toEqual(
            getNotificationTemplateSample('COUNSELLOR_IS_ILL', 'en'),
        );
        expect(getNotificationTemplate(null, 'COUNSELLOR_IS_ILL', 'de')).toEqual(
            getNotificationTemplateSample('COUNSELLOR_IS_ILL', 'de'),
        );
    });

    it('writes, trims and clears per-language templates on the matching reason only', () => {
        const policies = [policy({ code: 'A' }), policy({ code: 'B' })];
        const written = applyNotificationTemplate(policies, 'A', 'de', '  Neuer Text  ');
        expect(written[0].clientNotificationTemplates).toEqual({ de: 'Neuer Text' });
        expect(written[1].clientNotificationTemplates).toBeUndefined();

        const cleared = applyNotificationTemplate(written, 'A', 'de', '   ');
        expect(cleared[0].clientNotificationTemplates).toBeNull();
    });

    it('provides a notification sample for every seeded reason in every language', () => {
        Object.keys(NOTIFICATION_TEMPLATE_SAMPLES).forEach((code) => {
            NOTIFICATION_LANGUAGES.forEach((language) => {
                expect(getNotificationTemplateSample(code, language)).not.toEqual('');
            });
        });
        expect(getNotificationTemplateSample('UNKNOWN', 'de')).toEqual('');
    });
});
