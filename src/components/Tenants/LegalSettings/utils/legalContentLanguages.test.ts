import { describe, expect, it } from 'vitest';
import {
    getEditableLanguages,
    isEditableLanguageKey,
    mergeLegalContentMap,
    parseLegalContentMap,
    pickLegalContentLanguage,
} from './legalContentLanguages';

describe('parseLegalContentMap', () => {
    it('parses a JSON language map', () => {
        expect(parseLegalContentMap('{"de":"<p>DE</p>","en":"<p>EN</p>"}')).toEqual({
            de: '<p>DE</p>',
            en: '<p>EN</p>',
        });
    });

    it('keeps unknown and metadata-suffixed keys', () => {
        expect(parseLegalContentMap('{"de":"<p>DE</p>","de__meta":"m","fr":"<p>FR</p>"}')).toEqual({
            de: '<p>DE</p>',
            de__meta: 'm',
            fr: '<p>FR</p>',
        });
    });

    it('exposes legacy plain content under de', () => {
        expect(parseLegalContentMap('<p>old plain content</p>')).toEqual({ de: '<p>old plain content</p>' });
    });

    it('returns an empty map for empty content', () => {
        expect(parseLegalContentMap(null)).toEqual({});
        expect(parseLegalContentMap(undefined)).toEqual({});
        expect(parseLegalContentMap('')).toEqual({});
    });
});

describe('pickLegalContentLanguage', () => {
    it('returns the active language', () => {
        expect(pickLegalContentLanguage('{"de":"<p>DE</p>","en":"<p>EN</p>"}', 'en')).toBe('<p>EN</p>');
    });

    it('falls back to the first stored language', () => {
        expect(pickLegalContentLanguage('{"de":"<p>DE</p>"}', 'en')).toBe('<p>DE</p>');
    });
});

describe('isEditableLanguageKey', () => {
    it('accepts plain language codes', () => {
        expect(isEditableLanguageKey('de')).toBe(true);
        expect(isEditableLanguageKey('en')).toBe(true);
        expect(isEditableLanguageKey('de-CH')).toBe(true);
    });

    it('rejects metadata-suffixed and other keys', () => {
        expect(isEditableLanguageKey('de__meta')).toBe(false);
        expect(isEditableLanguageKey('germany')).toBe(false);
        expect(isEditableLanguageKey('')).toBe(false);
    });
});

describe('getEditableLanguages', () => {
    it('uses the active languages plus stored plain language keys', () => {
        expect(getEditableLanguages(['de', 'en'], { de: 'x', fr: 'y', de__meta: 'm' })).toEqual(['de', 'en', 'fr']);
    });

    it('defaults to de when no active languages are configured', () => {
        expect(getEditableLanguages(undefined, {})).toEqual(['de']);
        expect(getEditableLanguages([], {})).toEqual(['de']);
    });
});

describe('mergeLegalContentMap', () => {
    it('keeps unedited languages when only one language was edited', () => {
        expect(mergeLegalContentMap({ de: '<p>DE</p>', en: '<p>EN</p>' }, { en: '<p>EN new</p>' })).toEqual({
            de: '<p>DE</p>',
            en: '<p>EN new</p>',
        });
    });

    it('passes unknown keys through untouched', () => {
        expect(mergeLegalContentMap({ de: '<p>DE</p>', de__meta: 'm', fr: '<p>FR</p>' }, { de: '<p>new</p>' })).toEqual(
            { de: '<p>new</p>', de__meta: 'm', fr: '<p>FR</p>' },
        );
    });

    it('does not add languages that stayed empty', () => {
        expect(mergeLegalContentMap({ de: '<p>DE</p>' }, { en: '<p></p>' })).toEqual({ de: '<p>DE</p>' });
    });

    it('keeps an existing language that was cleared on purpose', () => {
        expect(mergeLegalContentMap({ de: '<p>DE</p>', en: '<p>EN</p>' }, { en: '<p></p>' })).toEqual({
            de: '<p>DE</p>',
            en: '',
        });
    });
});
