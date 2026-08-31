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

/**
 * CTS-C01 set-only SMTP credentials: the test-mail gate no longer requires
 * username/password (the backend test endpoint reads the STORED credentials),
 * so the old error text naming them is wrong and retired. The gate now only
 * checks the connection fields and uses `errorMissingConnection` instead.
 */
describe('retired SMTP test-mail gate key (CTS-C01 set-only credentials)', () => {
    it('drops globalSettings.smtp.test.errorMissingSmtp from de, en, and the English manual file', () => {
        expect(de['globalSettings.smtp.test.errorMissingSmtp']).toBeUndefined();
        expect(en['globalSettings.smtp.test.errorMissingSmtp']).toBeUndefined();
        expect(manual['globalSettings.smtp.test.errorMissingSmtp']).toBeUndefined();
    });

    it('carries the replacement key and the set-only credential copy in all files', () => {
        const addedKeys = [
            'globalSettings.smtp.test.errorMissingConnection',
            'globalSettings.smtp.username.placeholder',
            'globalSettings.smtp.username.helpText',
            'globalSettings.smtp.password.placeholder',
            'globalSettings.smtp.password.helpText',
        ];
        addedKeys.forEach((key) => {
            expect(de[key], `de is missing ${key}`).toBeTruthy();
            expect(en[key], `en is missing ${key}`).toBeTruthy();
            expect(manual[key], `manual en file is missing ${key}`).toBeTruthy();
        });
    });
});

/**
 * Owner request on ORISO-Admin PR #892: the secure-toggle description used to
 * read as if OFF meant plaintext. In the backend (UserService
 * JakartaInviteMailTransport) secure=false means MANDATORY STARTTLS
 * (starttls.enable + starttls.required — plaintext is refused, typical for
 * port 587) and secure=true means implicit TLS from the first byte (typical
 * for port 465). Pin the copy so it keeps saying that OFF is still encrypted.
 */
describe('secure-toggle description explains that OFF is mandatory STARTTLS, not plaintext', () => {
    it('mentions STARTTLS and both typical ports in de, en, and the English manual file', () => {
        const key = 'globalSettings.smtp.secure.description';
        [de, en, manual].forEach((file) => {
            expect(file[key]).toContain('STARTTLS');
            expect(file[key]).toContain('465');
            expect(file[key]).toContain('587');
        });
        // The old copy implied OFF = unencrypted; the new copy must rule that out.
        expect(de[key]).toContain('unverschlüsselter Versand');
        expect(en[key]).toContain('Unencrypted sending');
    });
});

/**
 * Owner request on ORISO-Admin PR #892: the e-mail theme color field is gone
 * from the SMTP card — e-mail design comes from the e-mail design system /
 * tenant theming, and the backend deliberately ignores this value (see the
 * #914 decision in UserService InviteMailDispatchService.renderBrandedMail:
 * "a transport setting is not a design token"). The tenant-level
 * `tenants.appSettings.smtp.emailThemeColor` key is NOT retired here.
 */
describe('retired SMTP e-mail theme color key (#914: transport settings are not design tokens)', () => {
    it('drops globalSettings.smtp.emailThemeColor from de, en, and the English manual file', () => {
        expect(de['globalSettings.smtp.emailThemeColor']).toBeUndefined();
        expect(en['globalSettings.smtp.emailThemeColor']).toBeUndefined();
        expect(manual['globalSettings.smtp.emailThemeColor']).toBeUndefined();
    });
});
