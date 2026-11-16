import { describe, expect, it } from 'vitest';
import {
    PLATFORM_LANGUAGES,
    PLATFORM_TRANSLATION_TARGETS,
    applyPlatformTranslations,
    buildPlatformPayload,
    changedPlatformKeys,
    collectPlatformSourceTexts,
    languagesWithoutText,
    purgeStalePlatformTranslations,
} from './platformGreeting';

describe('platform greeting publish helpers', () => {
    it('covers all seven language versions and translates into every non-German one', () => {
        expect(PLATFORM_LANGUAGES).toEqual(['de', 'de@informal', 'en', 'fr', 'ru', 'tr', 'ti']);
        expect(PLATFORM_TRANSLATION_TARGETS).toEqual(['en', 'fr', 'ru', 'tr', 'ti']);
    });

    it('treats only a changed formal German text as a change', () => {
        const stored = { greeting: { de: '<p>A</p>', en: '<p>A-en</p>' }, closing: { de: '<p>B</p>' } };
        const content = {
            greeting: { de: '<p>A2</p>', en: '<p>A-en</p>' },
            closing: { de: '<p>B</p>', en: '<p>manual</p>' },
        };
        expect(changedPlatformKeys(content, stored)).toEqual(['greeting']);
        expect(collectPlatformSourceTexts(content, ['greeting'])).toEqual({ greeting: '<p>A2</p>' });
    });

    it('removes the translations of a changed text but keeps both German variants', () => {
        const stored = {
            greeting: { de: '<p>A</p>', 'de@informal': '<p>Du</p>', en: '<p>A-en</p>', en__meta: '{"mt":true}' },
        };
        const content = { greeting: { ...stored.greeting, de: '<p>A2</p>' } };

        expect(purgeStalePlatformTranslations(content, stored).greeting).toEqual({
            de: '<p>A2</p>',
            'de@informal': '<p>Du</p>',
            en: '',
            en__meta: '',
        });
    });

    it('adds machine translations with their meta marker and skips empty ones', () => {
        const result = applyPlatformTranslations(
            { greeting: { de: '<p>Hallo</p>' } },
            { en: { greeting: '<p>Hello</p>' }, fr: { greeting: '' } },
            '2026-11-16T10:00:00.000Z',
        );
        expect(result.greeting?.en).toBe('<p>Hello</p>');
        expect(JSON.parse(result.greeting?.en__meta ?? '{}')).toMatchObject({ mt: true, src: 'de' });
        expect(result.greeting).not.toHaveProperty('fr');
    });

    it('sends emptied texts as "" so the backend falls back to the Caritas default', () => {
        expect(
            buildPlatformPayload({
                greeting: { de: '<p></p>', en: '<p>Hi</p>', en__meta: '{"mt":true}' },
                closing: { de: '', de__meta: 'x' },
            }),
        ).toEqual({
            greeting: { de: '', en: '<p>Hi</p>', en__meta: '{"mt":true}' },
            closing: { de: '', de__meta: '' },
        });
    });

    it('names the languages that still fall back to the Caritas default', () => {
        expect(languagesWithoutText({ de: '<p>x</p>', en: '<p></p>', fr: 'y' })).toEqual([
            'de@informal',
            'en',
            'ru',
            'tr',
            'ti',
        ]);
    });
});
