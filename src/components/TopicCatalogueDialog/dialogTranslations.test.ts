import { describe, expect, it } from 'vite-plus/test';
import { applyMachineTranslations, collectMissingTexts, toPlainText } from './dialogTranslations';

const topics = () => [
    { id: 1, name: { de: 'Schulden', en: 'Debt' }, description: { de: 'Hilfe' } },
    { id: 2, name: {}, description: {} },
];
const groups = () => [{ key: 'g1', name: { de: 'Krisen', en: 'Crises', fr: 'Crises' } }];

describe('collectMissingTexts', () => {
    it('sends each source text that some language lacks, and only the languages that lack something', () => {
        expect(collectMissingTexts(topics(), groups(), ['de', 'en', 'fr'], 'de')).toEqual({
            texts: { 'topic:1:name': 'Schulden', 'topic:1:description': 'Hilfe' },
            targets: ['en', 'fr'],
        });
    });

    it('sends nothing when every language is complete', () => {
        expect(
            collectMissingTexts(
                groups().map((g) => ({ id: 1, name: g.name, description: g.name })),
                [],
                ['de', 'en', 'fr'],
                'de',
            ).targets,
        ).toEqual([]);
    });
});

describe('applyMachineTranslations', () => {
    it('fills empty fields only, as plain text, and names the changed topics', () => {
        const result = applyMachineTranslations(
            topics(),
            groups(),
            {
                en: { 'topic:1:name': 'MACHINE', 'topic:1:description': '<p>Help &amp; advice</p>' },
                fr: { 'topic:1:name': '<p>Dettes</p>', 'group:g1': 'MACHINE' },
            },
            'de',
        );
        expect(result.topics[0].name).toEqual({ de: 'Schulden', en: 'Debt', fr: 'Dettes' });
        expect(result.topics[0].description).toEqual({ de: 'Hilfe', en: 'Help & advice' });
        expect(result.groups[0].name.fr).toBe('Crises');
        expect(result.changedTopicIds).toEqual([1]);
        expect(result.filled).toBe(2);
    });
});

describe('toPlainText', () => {
    it('drops tags and entities', () => {
        expect(toPlainText('<p>A&nbsp;<strong>B</strong><br/>C</p>')).toBe('A B C');
    });
});
