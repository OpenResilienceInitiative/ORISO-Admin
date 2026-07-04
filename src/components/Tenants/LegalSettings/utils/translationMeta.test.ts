import { describe, expect, it } from 'vitest';
import {
    buildTranslationMeta,
    getTranslationMeta,
    isMachineTranslated,
    metaKeyFor,
    LEGAL_SOURCE_LANGUAGE,
} from './translationMeta';

describe('metaKeyFor', () => {
    it('appends the __meta suffix', () => {
        expect(metaKeyFor('en')).toBe('en__meta');
    });
});

describe('getTranslationMeta', () => {
    it('parses the JSON metadata of a language', () => {
        const map = { en: '<p>x</p>', en__meta: '{"mt":true,"src":"de","at":"2026-07-03T10:00:00Z"}' };
        expect(getTranslationMeta(map, 'en')).toEqual({ mt: true, src: 'de', at: '2026-07-03T10:00:00Z' });
    });

    it('returns null when there is no metadata', () => {
        expect(getTranslationMeta({ en: '<p>x</p>' }, 'en')).toBeNull();
        expect(getTranslationMeta(undefined, 'en')).toBeNull();
    });

    it('returns null for invalid metadata instead of throwing', () => {
        expect(getTranslationMeta({ en__meta: 'not-json' }, 'en')).toBeNull();
        expect(getTranslationMeta({ en__meta: '[1,2]' }, 'en')).toBeNull();
    });
});

describe('isMachineTranslated', () => {
    it('is true only when mt is true', () => {
        expect(isMachineTranslated({ en__meta: '{"mt":true,"src":"de"}' }, 'en')).toBe(true);
        expect(isMachineTranslated({ en__meta: '{"mt":false}' }, 'en')).toBe(false);
        expect(isMachineTranslated({}, 'en')).toBe(false);
    });
});

describe('buildTranslationMeta', () => {
    it('serialises mt/src/at', () => {
        expect(JSON.parse(buildTranslationMeta('de', '2026-07-03T10:00:00Z'))).toEqual({
            mt: true,
            src: 'de',
            at: '2026-07-03T10:00:00Z',
        });
    });

    it('defaults the timestamp to now (ISO)', () => {
        const meta = JSON.parse(buildTranslationMeta(LEGAL_SOURCE_LANGUAGE));
        expect(meta.mt).toBe(true);
        expect(meta.src).toBe('de');
        expect(new Date(meta.at).toISOString()).toBe(meta.at);
    });
});
