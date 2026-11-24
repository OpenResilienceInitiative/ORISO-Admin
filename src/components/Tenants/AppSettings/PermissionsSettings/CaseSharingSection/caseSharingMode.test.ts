import { describe, expect, it } from 'vite-plus/test';
import {
    caseSharingModeOf,
    caseSharingPolicyFromApi,
    caseSharingPolicyToApi,
    hasBothCaseSharingModes,
} from './caseSharingMode';

// ORISO-Admin#1558: team counselling (per Beratungsstelle) and case handover (per Träger) become one choice.
describe('caseSharingModeOf', () => {
    it('reads team counselling when the centre is a team centre', () => {
        expect(caseSharingModeOf({ teamAgency: true, caseHandoverEnabled: false })).toBe('teamCounselling');
    });

    it('reads case handover when only handover is on', () => {
        expect(caseSharingModeOf({ teamAgency: false, caseHandoverEnabled: true })).toBe('caseHandover');
    });

    it('reads none when neither is on', () => {
        expect(caseSharingModeOf({ teamAgency: false, caseHandoverEnabled: false })).toBe('none');
    });

    it('accepts the string shape the agency list uses for teamAgency', () => {
        expect(caseSharingModeOf({ teamAgency: 'true', caseHandoverEnabled: false })).toBe('teamCounselling');
        expect(caseSharingModeOf({ teamAgency: 'false', caseHandoverEnabled: true })).toBe('caseHandover');
    });

    it('is undefined while a value is unknown, never a guess', () => {
        expect(caseSharingModeOf({ teamAgency: undefined, caseHandoverEnabled: true })).toBeUndefined();
        expect(caseSharingModeOf({ teamAgency: false, caseHandoverEnabled: undefined })).toBeUndefined();
    });

    // Frank, 2026-11-20: both on today migrates to case handover, the safer choice (release note).
    it('reads case handover when both are on today', () => {
        expect(caseSharingModeOf({ teamAgency: true, caseHandoverEnabled: true })).toBe('caseHandover');
        expect(caseSharingModeOf({ teamAgency: 'true', caseHandoverEnabled: true })).toBe('caseHandover');
    });
});

describe('hasBothCaseSharingModes', () => {
    it('is true only when team counselling and handover are both on', () => {
        expect(hasBothCaseSharingModes({ teamAgency: true, caseHandoverEnabled: true })).toBe(true);
        expect(hasBothCaseSharingModes({ teamAgency: true, caseHandoverEnabled: false })).toBe(false);
        expect(hasBothCaseSharingModes({ teamAgency: false, caseHandoverEnabled: true })).toBe(false);
        expect(hasBothCaseSharingModes({ teamAgency: undefined, caseHandoverEnabled: true })).toBe(false);
    });
});

describe('caseSharingPolicyFromApi / caseSharingPolicyToApi (ORISO-TenantService#374)', () => {
    it('maps every stored mode to the section value and keeps mode and inheritance', () => {
        expect(caseSharingPolicyFromApi({ value: 'TEAM_COUNSELLING', mode: 'ENFORCED', inherited: true })).toEqual({
            value: 'teamCounselling',
            mode: 'ENFORCED',
            inherited: true,
        });
        expect(caseSharingPolicyFromApi({ value: 'CASE_HANDOVER', mode: 'SUGGESTED' })?.value).toBe('caseHandover');
        expect(caseSharingPolicyFromApi({ value: 'NONE', mode: 'SUGGESTED' })?.value).toBe('none');
    });

    it('reads an absent or unknown value as not loaded', () => {
        expect(caseSharingPolicyFromApi(undefined)).toBeUndefined();
        expect(caseSharingPolicyFromApi({ value: 'SOMETHING_NEW' as never, mode: 'SUGGESTED' })).toBeUndefined();
    });

    it('never writes the read-only inheritance marker', () => {
        expect(caseSharingPolicyToApi({ value: 'none', mode: 'ENFORCED', inherited: true })).toEqual({
            value: 'NONE',
            mode: 'ENFORCED',
        });
    });
});
