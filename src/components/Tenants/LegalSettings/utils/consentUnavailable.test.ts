import { describe, expect, it } from 'vitest';
import {
    CONSENT_DISCLAIMER_BY_LANGUAGE,
    CONSENT_DISCLAIMER_FALLBACK_LANGUAGE,
    consentDisclaimerFor,
} from './consentUnavailable';

/** The seven legal-content languages the platform publishes in (#914). */
const ACTIVE_CONTENT_LANGUAGES = ['de', 'en', 'fr', 'ru', 'tr', 'uk', 'ti'];

describe('consentDisclaimerFor', () => {
    it('carries the operator disclaimer in every active content language', () => {
        ACTIVE_CONTENT_LANGUAGES.forEach((language) => {
            expect(consentDisclaimerFor(language).length).toBeGreaterThan(80);
        });
    });

    it('gives each language its own wording, never a copy of the German one', () => {
        const wordings = ACTIVE_CONTENT_LANGUAGES.map((language) => consentDisclaimerFor(language));
        expect(new Set(wordings).size).toBe(ACTIVE_CONTENT_LANGUAGES.length);
    });

    it('offers no language beyond the seven that are actually active', () => {
        expect(Object.keys(CONSENT_DISCLAIMER_BY_LANGUAGE).sort()).toEqual([...ACTIVE_CONTENT_LANGUAGES].sort());
    });

    it('resolves a regional code to its base language', () => {
        expect(consentDisclaimerFor('de-CH')).toBe(CONSENT_DISCLAIMER_BY_LANGUAGE.de);
        expect(consentDisclaimerFor('EN-GB')).toBe(CONSENT_DISCLAIMER_BY_LANGUAGE.en);
    });

    // A legal warning that renders as nothing is worse than one in the wrong language.
    it('falls back to the default language instead of returning nothing', () => {
        const fallback = CONSENT_DISCLAIMER_BY_LANGUAGE[CONSENT_DISCLAIMER_FALLBACK_LANGUAGE];
        expect(consentDisclaimerFor('xx')).toBe(fallback);
        expect(consentDisclaimerFor(undefined)).toBe(fallback);
        expect(consentDisclaimerFor('')).toBe(fallback);
    });
});
