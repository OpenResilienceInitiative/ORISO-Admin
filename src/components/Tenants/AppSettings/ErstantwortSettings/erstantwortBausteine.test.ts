import { describe, expect, it } from 'vitest';
import { DEFAULT_RESPONSE_DEADLINE_DAYS, ERSTANTWORT_BAUSTEINE, germanVariantFor } from './erstantwortBausteine';

/**
 * ORISO-Admin#601. These pin the properties that are decisions rather than layout,
 * and that a later edit could quietly undo.
 */
describe('the Träger-authored Baustein catalogue', () => {
    it('offers exactly one free notice (ADR-018 §2)', () => {
        expect(ERSTANTWORT_BAUSTEINE.filter((b) => b.isFreeNotice)).toHaveLength(1);
    });

    it('makes who-reads-along mandatory and nothing else', () => {
        /* The Träger is the controller and ORISO the processor, so the platform
		   must not derive a claim about who can read a counselling room. */
        expect(ERSTANTWORT_BAUSTEINE.filter((b) => b.mandatory).map((b) => b.key)).toEqual([
            'erstantwortWhoReadsAlong',
        ]);
    });

    it('offers no editor for any derived Baustein', () => {
        /* Derived Bausteine are never editable (ADR-018 §2 guardrail). If one of
		   these ever appears here, a Träger can type a claim that contradicts the
		   configuration the system renders elsewhere. */
        const keys = ERSTANTWORT_BAUSTEINE.map((b) => b.key as string);

        expect(keys).not.toContain('erstantwortResponseDeadline');
        expect(keys).not.toContain('erstantwortNoPersonalData');
        expect(keys).not.toContain('erstantwortModalityNote');
        expect(keys).not.toContain('erstantwortDataProtection');
    });

    it('is exactly the five the Träger owns', () => {
        expect(ERSTANTWORT_BAUSTEINE.map((b) => b.key)).toEqual([
            'erstantwortGreeting',
            'erstantwortWhoReadsAlong',
            'erstantwortEmergencyAddition',
            'erstantwortFreeNotice',
            'erstantwortClosing',
        ]);
    });

    it('has a unique key and a help text per Baustein', () => {
        const keys = ERSTANTWORT_BAUSTEINE.map((b) => b.key);
        expect(new Set(keys).size).toBe(keys.length);
        ERSTANTWORT_BAUSTEINE.forEach((b) => {
            expect(b.labelKey).toBeTruthy();
            expect(b.helpKey).toBeTruthy();
        });
    });
});

describe('germanVariantFor', () => {
    it('asks a formal Träger for "Sie" only', () => {
        expect(germanVariantFor(true)).toBe('de');
    });

    it('asks an informal Träger for "Du" only', () => {
        expect(germanVariantFor(false)).toBe('de@informal');
    });

    it('defaults to formal when the tenant has no preference recorded', () => {
        /* The safer error: addressing somebody formally who expected "Du" is a
		   mismatch; the reverse reads as a service that does not know who it is
		   talking to. */
        expect(germanVariantFor(undefined)).toBe('de');
    });

    it('never returns both variants, so a Träger is never asked to write twice', () => {
        expect(typeof germanVariantFor(true)).toBe('string');
        expect(typeof germanVariantFor(false)).toBe('string');
    });
});

describe('the response deadline', () => {
    it('carries the platform default of 2 working days', () => {
        expect(DEFAULT_RESPONSE_DEADLINE_DAYS).toBe(2);
    });
});
