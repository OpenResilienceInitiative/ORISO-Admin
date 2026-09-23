import { describe, expect, it } from 'vitest';
import {
    applyClientConsent,
    applyClientConsentPolicy,
    applyModuleEnabled,
    buildDisplayReasons,
    canonicalReasonCode,
    isAdviceRequestReason,
    isAdvisorAbsentReason,
    isAdvisorConsentImplicit,
    isHandoverModuleEnabled,
    LEGAL_VIOLATION_PLACEHOLDER_CODE,
    NOTIFICATION_LANGUAGES,
    sortPoliciesByDisplayOrder,
    applyNotificationTemplate,
    getNotificationTemplate,
    reasonTranslationKey,
    resolvedClientConsentPolicy,
} from './caseHandoverCardUtils';
import type { CaseHandoverReasonPolicy } from '../../../../../types/caseHandoverReasonPolicy';
import type { CaseHandoverConsentPolicy } from '../../../../../types/permissionPolicy';

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

    // The UserService answers `clientConsent` as the bare enum string plus a separate
    // `clientConsentMode` (CaseHandoverService.CaseHandoverReason) — never as the policy
    // object the card writes. Reading only the object is what made a saved Opt-Out look
    // unsaved after a reload (UserService #1131).
    it('reads back the wire shape the UserService actually sends', () => {
        expect(
            resolvedClientConsentPolicy(
                policy({
                    clientConsent: 'OPT_OUT' as unknown as CaseHandoverConsentPolicy,
                    clientConsentMode: 'ENFORCED',
                    clientConsentRequired: false,
                }),
            ),
        ).toEqual({ value: 'OPT_OUT', mode: 'ENFORCED' });

        expect(
            resolvedClientConsentPolicy(
                policy({
                    clientConsent: 'OPT_IN' as unknown as CaseHandoverConsentPolicy,
                    clientConsentRequired: true,
                }),
            ),
        ).toEqual({ value: 'OPT_IN', mode: 'SUGGESTED' });
    });

    it('ignores an unusable consent value instead of rendering an empty control', () => {
        expect(
            resolvedClientConsentPolicy(
                policy({
                    clientConsent: 'MAYBE' as unknown as CaseHandoverConsentPolicy,
                    clientConsentRequired: true,
                }),
            ),
        ).toEqual({ value: 'OPT_IN', mode: 'SUGGESTED' });
    });

    it('sends a self-consistent payload so the stale mode cannot overwrite the new one', () => {
        const result = applyClientConsentPolicy([policy({ code: 'B', clientConsentMode: 'SUGGESTED' })], 'B', {
            value: 'OPT_OUT',
            mode: 'ENFORCED',
        });
        expect(result[0].clientConsentMode).toBe('ENFORCED');
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

    // UserService (US#1245) serves the neutral codes; TenantService still keys by the retired ones.
    describe('neutral and retired reason codes', () => {
        const RETIRED_TO_NEUTRAL = [
            ['COUNSELLOR_ASKED_FOR_ADVICE', 'ADVICE_REQUESTED'],
            ['COUNSELLOR_ON_HOLIDAY', 'PLANNED_ABSENCE'],
            ['COUNSELLOR_IS_ILL', 'UNPLANNED_ABSENCE'],
            ['COUNSELLOR_LEFT', 'ASSIGNMENT_ENDED'],
        ] as const;

        it.each(RETIRED_TO_NEUTRAL)('maps %s to %s, as UserService does', (retired, neutral) => {
            expect(canonicalReasonCode(retired)).toBe(neutral);
            expect(canonicalReasonCode(neutral)).toBe(neutral);
        });

        it('passes codes without a successor through unchanged', () => {
            expect(canonicalReasonCode('OTHER_EMERGENCY')).toBe('OTHER_EMERGENCY');
            expect(canonicalReasonCode(LEGAL_VIOLATION_PLACEHOLDER_CODE)).toBe(LEGAL_VIOLATION_PLACEHOLDER_CODE);
        });

        it.each(['ADVICE_REQUESTED', 'COUNSELLOR_ASKED_FOR_ADVICE'])('treats %s as the advice request', (code) => {
            expect(isAdviceRequestReason(code)).toBe(true);
            expect(isAdvisorConsentImplicit(code)).toBe(true);
            expect(isAdvisorAbsentReason(code)).toBe(false);
        });

        it.each([
            'PLANNED_ABSENCE',
            'UNPLANNED_ABSENCE',
            'ASSIGNMENT_ENDED',
            'COUNSELLOR_ON_HOLIDAY',
            'COUNSELLOR_IS_ILL',
            'COUNSELLOR_LEFT',
        ])('treats %s as an absence reason', (code) => {
            expect(isAdviceRequestReason(code)).toBe(false);
            expect(isAdvisorConsentImplicit(code)).toBe(false);
            expect(isAdvisorAbsentReason(code)).toBe(true);
        });

        it('labels a retired code with the translation of its neutral successor', () => {
            expect(reasonTranslationKey('COUNSELLOR_IS_ILL')).toBe(
                'tenants.permissions.card.caseHandover.reason.UNPLANNED_ABSENCE',
            );
            expect(reasonTranslationKey('UNPLANNED_ABSENCE')).toBe(
                'tenants.permissions.card.caseHandover.reason.UNPLANNED_ABSENCE',
            );
        });

        it('shows the four neutral reasons from UserService in display order', () => {
            const reasons = buildDisplayReasons([
                policy({ code: 'ASSIGNMENT_ENDED', displayOrder: 50 }),
                policy({ code: 'ADVICE_REQUESTED', displayOrder: 10 }),
                policy({ code: 'UNPLANNED_ABSENCE', displayOrder: 40 }),
                policy({ code: 'PLANNED_ABSENCE', displayOrder: 20 }),
            ]);
            expect(reasons.map((reason) => reason.code)).toEqual([
                'ADVICE_REQUESTED',
                'PLANNED_ABSENCE',
                'UNPLANNED_ABSENCE',
                'ASSIGNMENT_ENDED',
                LEGAL_VIOLATION_PLACEHOLDER_CODE,
            ]);
        });

        it('keeps retired codes as tabs while they have no neutral successor in the list', () => {
            const reasons = buildDisplayReasons([
                policy({ code: 'COUNSELLOR_ASKED_FOR_ADVICE', displayOrder: 10 }),
                policy({ code: 'COUNSELLOR_IS_ILL', displayOrder: 40 }),
            ]);
            expect(reasons.map((reason) => reason.code)).toEqual([
                'COUNSELLOR_ASKED_FOR_ADVICE',
                'COUNSELLOR_IS_ILL',
                LEGAL_VIOLATION_PLACEHOLDER_CODE,
            ]);
        });

        it('hides a retired row once its neutral successor is present', () => {
            const reasons = buildDisplayReasons([
                policy({ code: 'COUNSELLOR_IS_ILL', displayOrder: 40, enabled: false }),
                policy({ code: 'UNPLANNED_ABSENCE', displayOrder: 40 }),
            ]);
            expect(reasons.map((reason) => reason.code)).toEqual([
                'UNPLANNED_ABSENCE',
                LEGAL_VIOLATION_PLACEHOLDER_CODE,
            ]);
        });

        it('module toggle leaves superseded retired rows disabled', () => {
            const next = applyModuleEnabled(
                [
                    policy({ code: 'COUNSELLOR_IS_ILL', enabled: false }),
                    policy({ code: 'UNPLANNED_ABSENCE', enabled: false }),
                ],
                true,
            );
            expect(next.map((p) => [p.code, p.enabled])).toEqual([
                ['COUNSELLOR_IS_ILL', false],
                ['UNPLANNED_ABSENCE', true],
            ]);
        });
    });
});
