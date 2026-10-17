import { describe, expect, it } from 'vitest';
import de from './de/translation.json';
import en from './en/translation.json';

/**
 * Frank, 17.10. (goal of #1536): the case-handover reason ASSIGNMENT_ENDED is labelled
 * neutrally everywhere. The label must not reveal why a counsellor is no longer assigned.
 */
describe('case handover reason ASSIGNMENT_ENDED label', () => {
    const key = 'tenants.permissions.card.caseHandover.reason.ASSIGNMENT_ENDED' as const;

    it('is "Zuordnung beendet" in German', () => {
        expect(de[key]).toBe('Zuordnung beendet');
    });

    it('is "Assignment ended" in English', () => {
        expect(en[key]).toBe('Assignment ended');
    });

    it.each([
        ['de', de[key]],
        ['en', en[key]],
    ])('does not hint at the counsellor leaving (%s)', (_language, label) => {
        expect(label).not.toMatch(/ausgeschieden|Zuständigkeit|left the organi[sz]ation/i);
    });
});
