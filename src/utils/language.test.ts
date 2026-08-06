import { beforeEach, describe, expect, it } from 'vitest';
import {
    DEFAULT_LANGUAGE,
    LANGUAGE_COOKIE_KEY,
    LANGUAGE_STORAGE_KEY,
    detectBrowserLanguage,
    getInitialLanguage,
    getStoredLanguage,
    isSupportedLanguage,
    normalizeLanguage,
    storeLanguage,
    updateDocumentLanguage,
} from './language';

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

    it('updates the document language attribute', () => {
        updateDocumentLanguage('en');

        expect(document.documentElement.lang).toBe('en');
    });

    it('falls back to the default language for non-German browsers', () => {
        expect(detectBrowserLanguage()).toBe(DEFAULT_LANGUAGE);
    });
});
