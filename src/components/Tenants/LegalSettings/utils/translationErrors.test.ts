import { describe, expect, it } from 'vitest';
import { TranslationApiError } from '../../../../api/tenant/translation';
import { TRANSLATION_DEFAULT_ERROR_KEY, getTranslationErrorKey } from './translationErrors';

describe('getTranslationErrorKey', () => {
    it.each([
        ['TRANSLATION_NOT_CONFIGURED', 'legal.translation.error.notConfigured'],
        ['TRANSLATION_KEY_INVALID', 'legal.translation.error.keyInvalid'],
        ['TRANSLATION_NO_CREDIT', 'legal.translation.error.noCredit'],
        ['TRANSLATION_RATE_LIMITED', 'legal.translation.error.rateLimited'],
        ['TRANSLATION_PROVIDER_UNAVAILABLE', 'legal.translation.error.providerUnavailable'],
    ])('maps %s to its human message key', (code, expectedKey) => {
        expect(getTranslationErrorKey(new TranslationApiError(code))).toBe(expectedKey);
    });

    it('falls back to the generic message for unknown codes (never raw codes)', () => {
        expect(getTranslationErrorKey(new TranslationApiError('SOMETHING_NEW'))).toBe(TRANSLATION_DEFAULT_ERROR_KEY);
    });

    it('falls back to the generic message for non-translation errors', () => {
        expect(getTranslationErrorKey(new Error('boom'))).toBe(TRANSLATION_DEFAULT_ERROR_KEY);
        expect(getTranslationErrorKey(undefined)).toBe(TRANSLATION_DEFAULT_ERROR_KEY);
    });
});
