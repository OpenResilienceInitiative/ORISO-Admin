import { describe, expect, it } from 'vitest';
import { deriveDpaGateDecision, canStartNewCounselling } from './dpaBlockerGate';

describe('AVV renewal accessibility', () => {
    it('keeps initial unsigned tenants blocked', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: 'UNSIGNED', isLoading: false, isError: false }),
        ).toEqual({ kind: 'blocked', reason: 'UNSIGNED', signable: true });
    });
    it('keeps renewal history, signing and ongoing work reachable regardless of deadline expiry', () => {
        expect(
            deriveDpaGateDecision({ subjectKind: 'subject', status: 'OUTDATED', isLoading: false, isError: false }),
        ).toEqual({ kind: 'inactive' });
    });
    it('uses the server permission even when the current version is not signed', () => {
        expect(canStartNewCounselling({ dpaPublished: true, dpaSigned: false, newCounsellingAllowed: true })).toBe(
            true,
        );
        expect(canStartNewCounselling({ dpaPublished: true, dpaSigned: true, newCounsellingAllowed: false })).toBe(
            false,
        );
    });
});
