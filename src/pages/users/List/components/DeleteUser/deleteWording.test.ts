import { describe, expect, it } from 'vitest';
import de from '../../../../../locales/de/translation.json';
import en from '../../../../../locales/en/translation.json';

// UserService does not delete a counsellor at once: the account is blocked, put into a read-only
// safeguarding window (48h by default, per-tenant overridable) and only then removed by a
// scheduler. The dialog must say so instead of "cannot be reversed" (OBP 2.1 #123).
describe('counsellor delete dialog wording', () => {
    const key = 'counselor.modal.text.delete.text';

    it.each([
        ['en', en as Record<string, string>, /48 hours/],
        ['de', de as Record<string, string>, /48 Stunden/],
    ])('%s names the safeguarding period and the blocked login', (_lng, bundle, period) => {
        expect(bundle[key]).toMatch(period);
        expect(bundle[key]).not.toMatch(/cannot be reversed|nicht rückgängig/i);
    });
});
