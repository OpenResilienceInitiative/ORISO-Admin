import { describe, expect, it, vi } from 'vite-plus/test';
import { standardJourney, translationStatus, type JourneyStep } from './journey';
import {
    fakeSuggester,
    fakeTranslator,
    translateKeywords,
    translateStepMissing,
    translateText,
    type Translator,
} from './journeyTranslation';

const postcode = (): JourneyStep =>
    standardJourney('AGENCY_COUNSELLING', 'j', 1).phases.departure.find(
        (step) => step.core === 'postcode',
    ) as JourneyStep;

describe('machine translation through the Admin endpoint', () => {
    it('translates all missing texts of a step in one call, and marks those languages', async () => {
        const translator = vi.fn(fakeTranslator);
        const translated = await translateStepMissing(postcode(), translator);
        expect(translator).toHaveBeenCalledTimes(1);
        const [request] = translator.mock.calls[0];
        expect(request.sourceLang).toBe('de');
        expect(request.targetLangs).toEqual(['de@informal', 'fr', 'ru', 'ti', 'tr']);
        expect(Object.values(request.texts)).toEqual([
            'Postleitzahl',
            'Damit finden wir eine Beratungsstelle in Ihrer Nähe.',
        ]);
        expect(translated.title.fr).toBe('Postleitzahl (fr)');
        expect(translated.title.en).toBe('Postcode');
        expect(translationStatus(translated).machine).toEqual(['de@informal', 'fr', 'ru', 'ti', 'tr']);
    });

    it('makes no call when nothing is missing', async () => {
        const translator = vi.fn(fakeTranslator);
        const full = await translateStepMissing(postcode(), fakeTranslator);
        expect(await translateStepMissing(full, translator)).toBe(full);
        expect(translator).not.toHaveBeenCalled();
    });

    it('passes the error of the service on, so the dialog can name it', async () => {
        const failing: Translator = () => Promise.reject(new Error('TRANSLATION_NOT_CONFIGURED'));
        await expect(translateStepMissing(postcode(), failing)).rejects.toThrow('TRANSLATION_NOT_CONFIGURED');
    });

    it('translates one text into one language', async () => {
        expect(await translateText(fakeTranslator, 'Alter', 'tr')).toBe('Alter (tr)');
    });
});

describe('search terms in other languages', () => {
    it('translates the German terms into the chosen languages in one call, adding, never replacing', async () => {
        const translator = vi.fn(fakeTranslator);
        const next = await translateKeywords({ de: ['Schulden', 'Miete'], en: ['debt'] }, ['en', 'fr'], translator);
        expect(translator).toHaveBeenCalledTimes(1);
        expect(next.en).toEqual(['debt', 'Schulden (en)', 'Miete (en)']);
        expect(next.fr).toEqual(['Schulden (fr)', 'Miete (fr)']);
        expect(next.de).toEqual(['Schulden', 'Miete']);
    });

    it('makes no call without German terms', async () => {
        const translator = vi.fn(fakeTranslator);
        const keywords = { en: ['debt'] };
        expect(await translateKeywords(keywords, ['fr'], translator)).toBe(keywords);
        expect(translator).not.toHaveBeenCalled();
    });

    it('suggests only terms that are not there yet', async () => {
        const terms = await fakeSuggester({
            language: 'de',
            title: 'Ihre Situation',
            about: '',
            existing: ['schulden'],
        });
        expect(terms).not.toContain('Schulden');
        expect(terms).toContain('Inkasso');
    });
});
