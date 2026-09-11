import { describe, it, expect } from 'vitest';
import {
    canPublishConsentText,
    consentPublicationBlockers,
    hasMandatoryConsentToken,
    isBlankConsentText,
    MANDATORY_CONSENT_TOKEN,
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
    it('is empty when nothing was authored', () => {
        expect(consentPublicationBlockers({ de: '', en: '  ' })).toEqual([]);
        expect(consentPublicationBlockers(undefined)).toEqual([]);
    });

    it('lists every authored language that lacks the mandatory token', () => {
        expect(
            consentPublicationBlockers({
                de: 'Ich habe {{legal_links}} zur Kenntnis genommen.',
                en: 'I agree.',
                fr: '',
            }),
        ).toEqual(['en']);
    });

    it('blocks publication as soon as one language is affected', () => {
        expect(canPublishConsentText({ de: 'Ich stimme zu.' })).toBe(false);
        expect(canPublishConsentText({ de: 'Ich habe {{legal_links}} gelesen.' })).toBe(true);
    });
});
