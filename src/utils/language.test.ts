import { beforeEach, describe, expect, it } from 'vitest';
import {
    BACKEND_LANGUAGE_COOKIE_KEY,
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    LANGUAGE_STORAGE_KEY,
    detectBrowserLanguage,
    getInitialLanguage,
    getStoredLanguage,
    isSupportedLanguage,
    normalizeLanguage,
    storeLanguage,
    SupportedLanguage,
    updateDocumentLanguage,
} from './language';

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
        expect(isSupportedLanguage('fr')).toBe(false);
        expect(normalizeLanguage('de-DE')).toBe('de');
        expect(normalizeLanguage('fr-FR')).toBeNull();
    });

    it('stores and reads the preferred language from cookie/localStorage', () => {
        storeLanguage('de');

        expect(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
        expect(getStoredLanguage()).toBe('de');
        expect(getInitialLanguage()).toBe('de');
    });

    it.each<SupportedLanguage>(['en', 'de'])(
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

    it('falls back to the default language for non-German browsers', () => {
        expect(detectBrowserLanguage()).toBe(DEFAULT_LANGUAGE);
    });
});
