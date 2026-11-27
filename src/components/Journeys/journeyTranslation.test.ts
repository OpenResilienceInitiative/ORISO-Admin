import { describe, expect, it, vi } from 'vite-plus/test';
import { standardJourney, translationStatus, type JourneyStep } from './journey';
import { fakeSuggester, fakeTranslator } from './journeyFakes';
import {
    applyTranslationFill,
    requestStepTranslation,
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

describe('answers that arrive late never overwrite newer edits', () => {
    const question = (): JourneyStep => ({
        id: 's',
        kind: 'question',
        title: { de: 'Ihre Lage' },
        description: {},
        questions: [
            { id: 'q1', type: 'text', required: false, label: { de: 'Erste' }, options: [], version: 1 },
            { id: 'q2', type: 'text', required: false, label: { de: 'Zweite' }, options: [], version: 1 },
        ],
    });

    it('keeps a text typed while the translation was running', async () => {
        const fill = await requestStepTranslation(question(), fakeTranslator);
        const typed = { ...question(), title: { de: 'Ihre Lage', fr: 'Votre situation' } };
        expect(applyTranslationFill(typed, fill).title.fr).toBe('Votre situation');
    });

    it('does not bring back a question deleted while the translation was running', async () => {
        const fill = await requestStepTranslation(question(), fakeTranslator);
        const deleted = { ...question(), questions: question().questions?.slice(0, 1) };
        const after = applyTranslationFill(deleted, fill);
        expect(after.questions?.map((q) => q.id)).toEqual(['q1']);
        expect(after.questions?.[0].label.fr).toBe('Erste (fr)');
    });

    it('writes one field only while it still holds what it held when asked', () => {
        const step = question();
        const ask = { texts: [{ path: 'title', language: 'fr', text: 'Situation', expected: '' }] };
        expect(applyTranslationFill(step, ask).title.fr).toBe('Situation');
        const typedMeanwhile = { ...step, title: { de: 'Ihre Lage', fr: 'Ma situation' } };
        expect(applyTranslationFill(typedMeanwhile, ask)).toBe(typedMeanwhile);
    });
});

describe('search terms in other languages', () => {
    it('translates the German terms into the chosen languages in one call', async () => {
        const translator = vi.fn(fakeTranslator);
        const found = await translateKeywords(['Schulden', 'Miete'], ['en', 'fr'], translator);
        expect(translator).toHaveBeenCalledTimes(1);
        expect(found.en).toEqual(['debt', 'rent']);
        expect(found.fr).toEqual(['dettes', 'loyer']);
    });

    it('makes no call without German terms', async () => {
        const translator = vi.fn(fakeTranslator);
        expect(await translateKeywords([], ['fr'], translator)).toEqual({});
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
