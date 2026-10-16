import { describe, expect, it } from 'vitest';
import type { ErstantwortContentMap } from './ErstantwortTextsCard';
import {
    applyTranslations,
    buildErstantwortContentPayload,
    collectSourceTexts,
    translationTargetsFor,
} from './erstantwortPublish';

const AT = '2026-10-13T09:00:00.000Z';

const stored: ErstantwortContentMap = {
    erstantwortGreeting: {
        de: '<p>Guten Tag</p>',
        en: '<p>Old greeting</p>',
        en__meta: '{"mt":true,"src":"de","at":"2026-10-01T10:00:00.000Z"}',
    },
    erstantwortClosing: { 'de@informal': '<p>Tschüss</p>' },
    erstantwortFreeNotice: { de: '<p></p>' },
};

describe('translationTargetsFor', () => {
    it('offers every active language except the German variants, each once', () => {
        expect(translationTargetsFor(['de', 'en', 'de@informal', 'fr', 'en'])).toEqual(['en', 'fr']);
    });

    it('offers nothing when the tenant has no active languages', () => {
        expect(translationTargetsFor(undefined)).toEqual([]);
        expect(translationTargetsFor([])).toEqual([]);
    });
});

describe('collectSourceTexts', () => {
    it('collects the non-empty texts of the Träger German variant only', () => {
        expect(collectSourceTexts(stored, 'de')).toEqual({ erstantwortGreeting: '<p>Guten Tag</p>' });
    });

    it('reads the informal variant when the tenant writes in "du"', () => {
        expect(collectSourceTexts(stored, 'de@informal')).toEqual({ erstantwortClosing: '<p>Tschüss</p>' });
    });
});

describe('applyTranslations', () => {
    it('stores a translation next to the source with its __meta marker and leaves the rest alone', () => {
        const result = applyTranslations(stored, { en: { erstantwortGreeting: '<p>Good day</p>' } }, 'de', AT);

        expect(result.erstantwortGreeting).toEqual({
            de: '<p>Guten Tag</p>',
            en: '<p>Good day</p>',
            en__meta: JSON.stringify({ mt: true, src: 'de', at: AT }),
        });
        expect(result.erstantwortClosing).toEqual(stored.erstantwortClosing);
    });

    it('does not change the map it was given', () => {
        const before = JSON.stringify(stored);

        applyTranslations(stored, { en: { erstantwortGreeting: '<p>Good day</p>' } }, 'de', AT);

        expect(JSON.stringify(stored)).toBe(before);
    });

    it('ignores an empty translation instead of storing a blank language', () => {
        const result = applyTranslations(stored, { en: { erstantwortClosing: '<p></p>' } }, 'de', AT);

        expect(result.erstantwortClosing).toEqual({ 'de@informal': '<p>Tschüss</p>' });
    });
});

describe('buildErstantwortContentPayload', () => {
    it('sends every Baustein map that exists and no Baustein that was never written', () => {
        const payload = buildErstantwortContentPayload(stored, undefined);

        expect(Object.keys(payload).sort()).toEqual([
            'erstantwortClosing',
            'erstantwortFreeNotice',
            'erstantwortGreeting',
        ]);
    });

    it('omits the deadline when the Träger did not touch it', () => {
        expect(buildErstantwortContentPayload(stored, undefined)).not.toHaveProperty('erstantwortResponseDeadlineDays');
    });

    it('sends a chosen deadline as a number and a cleared one as 0, never as null', () => {
        expect(buildErstantwortContentPayload(stored, 5)).toHaveProperty('erstantwortResponseDeadlineDays', 5);
        expect(buildErstantwortContentPayload(stored, null)).toHaveProperty('erstantwortResponseDeadlineDays', 0);
    });

    it('sends an empty text as "" inside the full map instead of omitting or collapsing it', () => {
        const payload = buildErstantwortContentPayload(stored, undefined);

        expect(payload.erstantwortFreeNotice).toEqual({ de: '' });
        expect(payload.erstantwortGreeting).toEqual(stored.erstantwortGreeting);
    });

    it('blanks the __meta marker of a language whose text was emptied', () => {
        const payload = buildErstantwortContentPayload(
            { erstantwortGreeting: { de: '<p>Hallo</p>', en: '<p></p>', en__meta: '{"mt":true}' } },
            undefined,
        );

        expect(payload.erstantwortGreeting).toEqual({ de: '<p>Hallo</p>', en: '', en__meta: '' });
    });
});
