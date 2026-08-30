import { describe, expect, it } from 'vitest';
import translationDe from './de/translation.json';
import translationEn from './en/translation.json';
import enManual from '../../scripts/en-translations-manual.json';

const de = translationDe as Record<string, string>;
const en = translationEn as Record<string, string>;
const manual = enManual as Record<string, string>;

const retiredKeys = [
    'globalSettings.pageTitle',
    'globalSettings.tabs.login',
    'globalSettings.tabs.smtp',
    'globalSettings.navTitle',
] as const;

/**
 * ORISO-Admin#678: tab/nav labels for the retired section. Live SMTP copy stays.
 */
describe('retired globalSettings i18n keys (ORISO-Admin#678)', () => {
    it.each(retiredKeys)('drops %s from de, en, and the English manual file', (key) => {
        expect(de[key]).toBeUndefined();
        expect(en[key]).toBeUndefined();
        expect(manual[key]).toBeUndefined();
    });

    it('keeps the live SMTP family', () => {
        expect(de['globalSettings.smtp.title']).toBeTruthy();
        expect(en['globalSettings.smtp.title']).toBeTruthy();
        expect(de['globalSettings.smtp.host']).toBeTruthy();
        expect(en['globalSettings.smtp.host']).toBeTruthy();
    });
});
