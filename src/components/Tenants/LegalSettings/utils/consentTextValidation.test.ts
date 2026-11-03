import { describe, it, expect } from 'vitest';
import {
    canPublishConsentText,
    consentPublicationBlockers,
    hasMandatoryConsentToken,
    isBlankConsentText,
    MANDATORY_CONSENT_TOKEN,
    runTogetherPlaceholders,
} from './consentTextValidation';

describe('hasMandatoryConsentToken', () => {
    it('accepts the token', () => {
        expect(hasMandatoryConsentToken(`Ich habe {{${MANDATORY_CONSENT_TOKEN}}} gelesen.`)).toBe(true);
    });

    it('tolerates whitespace inside the braces', () => {
        expect(hasMandatoryConsentToken('Ich habe {{ legal_links }} gelesen.')).toBe(true);
    });

    it('rejects a sentence without it, and other tokens do not substitute for it', () => {
        expect(hasMandatoryConsentToken('Ich stimme zu.')).toBe(false);
        expect(hasMandatoryConsentToken('Hinweise der {{Beratungsstelle}} zum {{Thema}}.')).toBe(false);
    });

    it('rejects the Freemarker dialect — ADR-021 decision 6 forbids it for authored text', () => {
        // eslint-disable-next-line no-template-curly-in-string -- the literal Freemarker syntax IS the case under test
        expect(hasMandatoryConsentToken('Ich habe ${legal_links} gelesen.')).toBe(false);
    });

    it('treats an absent sentence as missing the token', () => {
        expect(hasMandatoryConsentToken(undefined)).toBe(false);
    });
});

describe('isBlankConsentText', () => {
    it('is true for absent and whitespace-only text', () => {
        expect(isBlankConsentText(undefined)).toBe(true);
        expect(isBlankConsentText('   ')).toBe(true);
    });
});

describe('consentPublicationBlockers', () => {
    it('reports blank languages too — the editor fills in the template, so blank is a gap', () => {
        expect(consentPublicationBlockers({ de: '', en: '  ' })).toEqual(['de', 'en']);
        expect(consentPublicationBlockers(undefined)).toEqual([]);
    });

    it('lists every language that is blank or lacks the mandatory token', () => {
        expect(
            consentPublicationBlockers({
                de: 'Ich habe {{legal_links}} zur Kenntnis genommen.',
                en: 'I agree.',
                fr: '',
            }),
        ).toEqual(['en', 'fr']);
    });

    it('blocks publication as soon as one language is affected', () => {
        expect(canPublishConsentText({ de: 'Ich stimme zu.' })).toBe(false);
        expect(canPublishConsentText({ de: 'Ich habe {{legal_links}} gelesen.' })).toBe(true);
    });
});

describe('runTogetherPlaceholders (#1255)', () => {
    it('names two placeholders that touch, and a space removes the warning', () => {
        expect(runTogetherPlaceholders('Ich habe die {{legal_links}}{{Thema}} gelesen')).toEqual([
            { first: '{{legal_links}}', second: '{{Thema}}' },
        ]);
        expect(runTogetherPlaceholders('Ich habe die {{legal_links}} {{Thema}} gelesen')).toEqual([]);
    });

    it('names a placeholder that touches a word, on either side', () => {
        expect(runTogetherPlaceholders('zum {{Thema}}Advice')).toEqual([{ first: '{{Thema}}', second: 'Advice' }]);
        expect(runTogetherPlaceholders('Ich habe die{{legal_links}} gelesen')).toEqual([
            { first: 'die', second: '{{legal_links}}' },
        ]);
    });

    it('does not warn for punctuation next to a placeholder', () => {
        expect(runTogetherPlaceholders('zum Thema {{Thema}}.')).toEqual([]);
        expect(runTogetherPlaceholders('({{Thema}}), {{Beratungsstelle}}!')).toEqual([]);
    });

    it('finds every spot of the sentence that reached help-seekers glued together (ORISO-Frontend#1920)', () => {
        expect(runTogetherPlaceholders('testing {{legal_links}}{{Thema}}{{Beratungsstelle}}')).toEqual([
            { first: '{{legal_links}}', second: '{{Thema}}' },
            { first: '{{Thema}}', second: '{{Beratungsstelle}}' },
        ]);
    });

    it('counts letters of any language and names the token without inner spaces', () => {
        expect(runTogetherPlaceholders('{{ Thema }}Ärger')).toEqual([{ first: '{{Thema}}', second: 'Ärger' }]);
    });

    it('is empty for an absent sentence', () => {
        expect(runTogetherPlaceholders(undefined)).toEqual([]);
    });
});
