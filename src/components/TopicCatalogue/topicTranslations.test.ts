import { describe, expect, it } from 'vite-plus/test';
import type { TopicLayout } from './topicLayout';
import {
    buildTranslateTexts,
    countMissing,
    machineMark,
    mergeTranslations,
    textIn,
    type LocalizedTopic,
} from './topicTranslations';

const topics = (): LocalizedTopic[] => [
    { id: 1, name: 'Trauerberatung', description: 'Begleitung bei Trauer', names: { en: 'Grief counselling' } },
    { id: 2, name: 'Sucht' },
];
const layout = (): TopicLayout => [{ id: 'g', name: 'Gesundheit', names: { en: 'Health' }, topicIds: [1, 2] }];

describe('textIn / countMissing', () => {
    it('reads the source or the translation', () => {
        expect(textIn('Sucht', undefined, 'de', 'de')).toBe('Sucht');
        expect(textIn('Sucht', { en: 'Addiction' }, 'en', 'de')).toBe('Addiction');
        expect(textIn('Sucht', undefined, 'fr', 'de')).toBe('');
    });

    it('counts the texts that lack a translation, never in the source language', () => {
        expect(countMissing(topics(), layout(), 'de', 'de')).toBe(0);
        // en: description of topic 1 and name of topic 2 are missing
        expect(countMissing(topics(), layout(), 'en', 'de')).toBe(2);
        // fr: 2 names + 1 description + 1 category
        expect(countMissing(topics(), layout(), 'fr', 'de')).toBe(4);
    });
});

describe('buildTranslateTexts', () => {
    it('sends every source text that lacks a translation in some target language', () => {
        expect(buildTranslateTexts(topics(), layout(), ['en'], 'de')).toEqual({
            'topicDescription:1': 'Begleitung bei Trauer',
            'topic:2': 'Sucht',
        });
        expect(Object.keys(buildTranslateTexts(topics(), layout(), ['en', 'fr'], 'de'))).toHaveLength(4);
    });
});

describe('mergeTranslations', () => {
    const response = {
        en: { 'topic:1': 'MACHINE', 'topic:2': 'Addiction', 'group:g': 'MACHINE' },
        fr: { 'topic:2': 'Dépendance' },
    };

    it('fills only gaps and keeps what a person wrote', () => {
        const merged = mergeTranslations(topics(), layout(), response, 'de');
        expect(merged.topics[0].names).toEqual({ en: 'Grief counselling' });
        expect(merged.topics[1].names).toEqual({ en: 'Addiction', fr: 'Dépendance' });
        expect(merged.layout[0].names).toEqual({ en: 'Health' });
        expect(merged.machine.sort()).toEqual([machineMark('en', 'topic:2'), machineMark('fr', 'topic:2')].sort());
    });

    it('ignores empty answers and the source language, and returns equal objects when nothing changes', () => {
        const input = topics();
        const merged = mergeTranslations(input, layout(), { de: { 'topic:2': 'x' }, en: { 'topic:2': ' ' } }, 'de');
        expect(merged.topics[1]).toBe(input[1]);
        expect(merged.machine).toEqual([]);
    });
});
