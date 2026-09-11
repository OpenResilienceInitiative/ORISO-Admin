import { describe, expect, it } from 'vitest';
import de from './de/translation.json';
import en from './en/translation.json';

/**
 * #873 / #874 leftover: the unlock and pending gate still said AVV / DPA after
 * the rest of the contract-document rename landed. The third-party AI vendor
 * DPA is a different contract and must stay (#873 exclusion).
 */
describe('contract documents wording on the DPA gate', () => {
    it('uses Vertragsunterlagen / contract documents on unlock and pending copy', () => {
        const deKeys = [
            'dpaUnlock.title',
            'dpaUnlock.description',
            'dpaUnlock.verifyNote',
            'dpaPending.gatedNote',
            'dpaPending.recheckRejected',
        ] as const;
        const enKeys = deKeys;

        deKeys.forEach((key) => {
            expect(de[key], key).toMatch(/Vertragsunterlagen/);
            expect(de[key], key).not.toMatch(/Auftragsverarbeitungsvertrag|\(AVV\)/);
        });
        enKeys.forEach((key) => {
            expect(en[key], key).toMatch(/contract documents/i);
            expect(en[key], key).not.toMatch(/data processing agreement|\(DPA\)/i);
        });
    });

    it('keeps the third-party AI vendor DPA wording', () => {
        expect(en['tenants.permissions.feature.mediaAiScanUnavailable']).toMatch(/data processing agreement/);
    });
});
