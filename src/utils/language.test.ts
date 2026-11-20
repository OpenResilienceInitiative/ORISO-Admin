// @vitest-environment-options {"url":"https://admin.example.test/admin/"}
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
    BACKEND_LANGUAGE_COOKIE_KEY,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    LANGUAGE_STORAGE_KEY,
    SUPPORTED_LANGUAGES,
    detectBrowserLanguage,
    getInitialLanguage,
    getStoredLanguage,
    isSupportedLanguage,
    normalizeLanguage,
    storeLanguage,
    SupportedLanguage,
    toIntlLocale,
    updateDocumentLanguage,
} from './language';

vi.mock('../config/runtimeConfig', () => ({
    runtimeConfig: { cookieDomain: '.example.test', cookieSecure: true },
}));

const readCookie = (name: string): string | null => {
    const match = decodeURIComponent(document.cookie)
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));
    return match ? match.substring(name.length + 1) : null;
};

const storage: Record<string, string> = {};

describe('language utilities', () => {
    beforeEach(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key: string) => storage[key] ?? null,
                setItem: (key: string, value: string) => {
                    storage[key] = value;
                },
            },
        });
        document.cookie = `${LANGUAGE_COOKIE_KEY}=;path=/;Max-Age=0`;
        document.cookie = `${BACKEND_LANGUAGE_COOKIE_KEY}=;path=/;Max-Age=0`;
        document.documentElement.lang = '';
    });

    it('normalizes supported locale strings', () => {
        expect(isSupportedLanguage('de')).toBe(true);
        expect(isSupportedLanguage('fr')).toBe(true);
        expect(normalizeLanguage('de-DE')).toBe('de');
        expect(normalizeLanguage('fr-FR')).toBe('fr');
        expect(normalizeLanguage('de@informal')).toBe('de@informal');
        expect(normalizeLanguage('ti-ER')).toBe('ti');
        expect(normalizeLanguage('es')).toBeNull();
    });

    it('stores and reads the preferred language from cookie/localStorage', () => {
        storeLanguage('de');

        expect(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
        expect(getStoredLanguage()).toBe('de');
        expect(getInitialLanguage()).toBe('de');
    });

    it.each<SupportedLanguage>(['en', 'de', 'de@informal', 'fr', 'ru', 'tr', 'ti'])(
        'mirrors the stored language into the backend `lang` cookie for %s',
        (language) => {
            // ConsultingTypeService resolves localized topic names from the `lang`
            // cookie only, so storeLanguage must keep it in sync with the UI (#564).
            storeLanguage(language);

            expect(readCookie(BACKEND_LANGUAGE_COOKIE_KEY)).toBe(language);
            expect(readCookie(LANGUAGE_COOKIE_KEY)).toBe(language);
        },
    );

    it('updates the document language attribute', () => {
        updateDocumentLanguage('en');

        expect(document.documentElement.lang).toBe('en');
    });

    it('gives Intl a valid locale for every supported language (Admin#1503)', () => {
        expect(toIntlLocale('de@informal')).toBe('de');
        expect(toIntlLocale('de')).toBe('de');
        expect(toIntlLocale('tr')).toBe('tr');
        expect(toIntlLocale(undefined)).toBeUndefined();
        SUPPORTED_LANGUAGES.forEach((language) => {
            expect(() => new Intl.DateTimeFormat(toIntlLocale(language))).not.toThrow();
        });
    });

    it('falls back to the default language for non-German browsers', () => {
        expect(detectBrowserLanguage()).toBe(DEFAULT_LANGUAGE);
    });
});
